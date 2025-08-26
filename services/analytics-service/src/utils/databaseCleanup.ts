import { PerformanceHistory } from '../models/PerformanceHistory.js';
import { logger } from './logger.js';
import type { ObjectId } from '../types/index.js';

export class DatabaseCleanup {
  /**
   * Merge duplicate performance records for the same user, subject, and grade
   * This handles cases where duplicates were created before normalization was implemented
   */
  static async mergeDuplicatePerformanceRecords(): Promise<void> {
    try {
      logger.info('Starting duplicate performance records cleanup...');

      // Find all performance records grouped by user, normalized subject, and grade
      const pipeline = [
        {
          $addFields: {
            normalizedSubject: {
              $trim: {
                input: {
                  $replaceAll: {
                    input: { $toLower: '$subject' },
                    find: '  ',
                    replacement: ' '
                  }
                }
              }
            }
          }
        },
        {
          $group: {
            _id: {
              userId: '$userId',
              normalizedSubject: '$normalizedSubject',
              grade: '$grade'
            },
            records: { $push: '$$ROOT' },
            count: { $sum: 1 }
          }
        },
        {
          $match: { count: { $gt: 1 } }
        }
      ];

      const duplicateGroups = await PerformanceHistory.aggregate(pipeline);
      
      logger.info(`Found ${duplicateGroups.length} groups with duplicate records`);

      let mergedCount = 0;
      let deletedCount = 0;

      for (const group of duplicateGroups) {
        const records = group.records;
        
        // Sort by lastCalculatedAt to get the most recent record first
        records.sort((a: any, b: any) => new Date(b.lastCalculatedAt).getTime() - new Date(a.lastCalculatedAt).getTime());
        
        const primaryRecord = records[0];
        const duplicateRecords = records.slice(1);

        logger.info(`Merging ${duplicateRecords.length} duplicate records for user ${group._id.userId}, subject: ${group._id.normalizedSubject}, grade: ${group._id.grade}`);

        // Merge stats from all records
        const mergedStats = {
          totalQuizzes: 0,
          averageScore: 0,
          bestScore: 0,
          worstScore: 100,
          totalTimeSpent: 0,
          consistency: 0
        };

        const allRecentPerformances: any[] = [];
        const allTopicStats = new Map();

        // Aggregate data from all records
        let totalScoreSum = 0;
        let totalQuizCount = 0;

        for (const record of records) {
          const stats = record.stats;
          totalQuizCount += stats.totalQuizzes;
          totalScoreSum += stats.averageScore * stats.totalQuizzes;
          
          mergedStats.bestScore = Math.max(mergedStats.bestScore, stats.bestScore);
          mergedStats.worstScore = Math.min(mergedStats.worstScore, stats.worstScore);
          mergedStats.totalTimeSpent += stats.totalTimeSpent;
          
          // Collect all recent performances
          allRecentPerformances.push(...record.recentPerformance);
          
          // Merge topic stats
          record.topicWiseStats.forEach((topic: any) => {
            const key = topic.topic;
            if (allTopicStats.has(key)) {
              const existing = allTopicStats.get(key);
              existing.totalQuestions += topic.totalQuestions;
              existing.correctAnswers += topic.correctAnswers;
              existing.accuracy = (existing.correctAnswers / existing.totalQuestions) * 100;
              
              // Average the time per question weighted by question count
              const totalTime = (existing.avgTimePerQuestion * (existing.totalQuestions - topic.totalQuestions)) + 
                               (topic.avgTimePerQuestion * topic.totalQuestions);
              existing.avgTimePerQuestion = totalTime / existing.totalQuestions;
            } else {
              allTopicStats.set(key, { ...topic });
            }
          });
        }

        // Calculate final merged stats
        mergedStats.totalQuizzes = totalQuizCount;
        mergedStats.averageScore = totalQuizCount > 0 ? totalScoreSum / totalQuizCount : 0;
        
        // Sort recent performances and keep only the latest 20
        allRecentPerformances.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const finalRecentPerformances = allRecentPerformances.slice(0, 20);
        
        // Calculate consistency from recent performances
        if (finalRecentPerformances.length > 1) {
          const scores = finalRecentPerformances.map((p: any) => p.score);
          const mean = scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length;
          const variance = scores.reduce((sum: number, score: number) => sum + Math.pow(score - mean, 2), 0) / scores.length;
          mergedStats.consistency = Math.max(0, 100 - Math.sqrt(variance));
        }

        // Update primary record with merged data
        await PerformanceHistory.findByIdAndUpdate(primaryRecord._id, {
          $set: {
            subject: primaryRecord.subject, // Keep the original case from the most recent record
            stats: mergedStats,
            recentPerformance: finalRecentPerformances,
            topicWiseStats: Array.from(allTopicStats.values()),
            lastCalculatedAt: new Date()
          }
        });

        // Delete duplicate records
        const duplicateIds = duplicateRecords.map((r: any) => r._id);
        await PerformanceHistory.deleteMany({ _id: { $in: duplicateIds } });
        
        mergedCount++;
        deletedCount += duplicateIds.length;

        logger.info(`Merged ${duplicateIds.length} duplicates into primary record ${primaryRecord._id}`);
      }

      logger.info(`Duplicate cleanup completed. Merged ${mergedCount} groups, deleted ${deletedCount} duplicate records`);

    } catch (error) {
      logger.error('Failed to merge duplicate performance records:', error);
      throw error;
    }
  }

  /**
   * Clean up orphaned or invalid performance records
   */
  static async cleanupInvalidRecords(): Promise<void> {
    try {
      logger.info('Starting cleanup of invalid performance records...');

      // Remove records with invalid stats
      const invalidStats = await PerformanceHistory.deleteMany({
        $or: [
          { 'stats.totalQuizzes': { $lt: 0 } },
          { 'stats.averageScore': { $lt: 0 } },
          { 'stats.averageScore': { $gt: 100 } },
          { 'stats.bestScore': { $lt: 0 } },
          { 'stats.bestScore': { $gt: 100 } },
          { 'stats.worstScore': { $lt: 0 } },
          { 'stats.worstScore': { $gt: 100 } },
          { subject: { $in: ['', null] } },
          { grade: { $not: { $gte: 1, $lte: 12 } } }
        ]
      });

      logger.info(`Removed ${invalidStats.deletedCount} records with invalid stats`);

      // Trim and normalize subject names in existing records
      const recordsToUpdate = await PerformanceHistory.find({
        $or: [
          { subject: { $regex: /^\s|\s$/ } }, // Leading or trailing spaces
          { subject: { $regex: /\s{2,}/ } }    // Multiple consecutive spaces
        ]
      });

      let normalizedCount = 0;
      for (const record of recordsToUpdate) {
        const normalizedSubject = record.subject.trim().replace(/\s+/g, ' ');
        if (normalizedSubject !== record.subject) {
          await PerformanceHistory.findByIdAndUpdate(record._id, {
            $set: { subject: normalizedSubject }
          });
          normalizedCount++;
        }
      }

      logger.info(`Normalized ${normalizedCount} subject names`);

    } catch (error) {
      logger.error('Failed to cleanup invalid records:', error);
      throw error;
    }
  }
}
