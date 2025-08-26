# 🎓 Azure Student Quick Reference - Quizzer Deployment

## 🚀 Quick Start (5 minutes)

```bash
# 1. Login to Azure
az login

# 2. Run setup script
./azure-setup.sh

# 3. Add GitHub secrets (from script output)
# - AZURE_CREDENTIALS
# - REGISTRY_USERNAME  
# - REGISTRY_PASSWORD
# - CONTAINER_REGISTRY_NAME
# 4. Push to microservices branch
git push origin microservices

# 5. Monitor deployment
./azure-verify.sh
```

## 💰 Cost Summary

| What | Cost/Month | Notes |
|------|------------|-------|
| Container Registry | $5 | Always running |
| 5 Microservices (24/7) | $15-25 | Can be stopped to save money |
| **Total** | **$20-30** | **Out of $100 student credit** |
| **Smart Usage** | **$8-15** | **Stop when not needed** |

## 🛠️ Essential Commands

```bash
# Cost monitoring
./azure-cost-monitor.sh

# Stop all services (save money)
./azure-manage.sh stop

# Start all services
./azure-manage.sh start

# Check what's running
./azure-manage.sh status

# View service logs
./azure-manage.sh logs ai-service

# Clean everything up
./azure-cleanup.sh
```

## 🌐 Service URLs (after deployment)

Your services will be available at public IPs:

- **AI Service**: `http://<ip>:3001`
- **Analytics Service**: `http://<ip>:3002`
- **Auth Service**: `http://<ip>:3003`
- **Quiz Service**: `http://<ip>:3004`
- **Submission Service**: `http://<ip>:3005`

Get IPs with: `./azure-verify.sh`

## 📱 Mobile-Friendly Monitoring

### Azure Mobile App
- Download "Microsoft Azure" app
- Monitor costs on your phone
- Get spending alerts

### Quick Cost Check
```bash
# Check current status and costs
./azure-manage.sh status
```

## 🆘 Troubleshooting

### "Not enough credits"
```bash
# Check remaining credits
./azure-cost-monitor.sh

# Stop services to reduce costs
./azure-manage.sh stop
```

### "Deployment failed"
```bash
# Check logs
./azure-manage.sh logs <service-name>

# Restart service
./azure-manage.sh restart <service-name>
```

### "Can't access service"
```bash
# Check if running
./azure-manage.sh status

# Get current IPs
./azure-verify.sh
```

## 🎯 Best Practices for Students

1. **Set up budget alerts** at $50 and $80
2. **Stop services** when not actively developing
3. **Monitor weekly** with `./azure-cost-monitor.sh`
4. **Use external databases** (MongoDB Atlas, Redis Cloud free tiers)
5. **Keep this setup** for other projects too!

## 🔗 Important Links

- [Azure Student Dashboard](https://www.microsoftazurestudents.com/)
- [Azure Cost Management](https://portal.azure.com/#blade/Microsoft_Azure_CostManagement/Menu/overview)
- [GitHub Repository Secrets](https://github.com/JaiminPatel345/quizzer/settings/secrets/actions)
- [Azure Portal](https://portal.azure.com/)

## 📞 Support

### Azure Student Support
- [Azure Student Help](https://docs.microsoft.com/en-us/azure/education-hub/)
- [Azure Community Forums](https://docs.microsoft.com/en-us/answers/products/azure)

### Project Issues
- Check logs: `./azure-manage.sh logs <service>`
- Restart services: `./azure-manage.sh restart`
- Full cleanup: `./azure-cleanup.sh` (then re-run `./azure-setup.sh`)

---

💡 **Pro Tip**: Bookmark this file! Keep it handy for quick reference during development.

🎓 **Remember**: You have $100/month credit - this setup uses only $20-30, leaving plenty for learning other Azure services!
