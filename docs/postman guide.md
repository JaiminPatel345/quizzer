## Guide for postman collection

### Online :

- https://abhinavam.postman.co/workspace/My-Workspace~de25a613-146b-4da1-8aff-e53e92a40b09/collection/33142602-1d56e468-64ab-4f86-bc9a-435e632a8137?action=share&creator=33142602&active-environment=33142602-6cc90b14-449b-4c77-bc7f-107bcfc925ca

### Offline :

- download OR import docs/postman_collection.json file in postman app ( select v2.1 )

### things to note :

- In this collection I added all endpoints ( with response ) which client can call. Other endpoints are internal and not
  needed to be called by client
- I use variables in url like `{{auth}}` and `{{ai}}`. values of them are
    - `auth` = http://localhost:3001 OR http://quizzer-auth-1756068070.southindia.azurecontainer.io:3001
    - `quiz` = http://localhost:3002 OR http://quizzer-quiz-1756068070.southindia.azurecontainer.io:3002
    - `ai` = http://localhost:3003 OR http://quizzer-ai-1756068070.southindia.azurecontainer.io:3003
    - `submission` = http://localhost:3004  OR  http://quizzer-submission-1756068070.southindia.azurecontainer.io:3004
    - `analytics` = http://localhost:3005 OR http://quizzer-analytics-1756068070.southindia.azurecontainer.io:3005
    - Also use environment variable like `{{token}}` in Bearer Token (Authentication)
        - User `jaimin123` as `username` and `password` both for login and signup (yes I know it is very strong
          password :/ ) OR
        - Use this `token` value which works till 29th Aug 2025 :
            -
            eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGE5ZjJkMTdhMDcxZTFlNzFjYTU5NjYiLCJ1c2VybmFtZSI6ImphaW1pbjEyMyIsImVtYWlsIjoiamFpbWlucGF0ZWwwMzA0MjAwNUBnbWFpbC5jb20iLCJpYXQiOjE3NTU5NjkwNzcsImV4cCI6MTc1NjU3Mzg3N30._
            NNmiqIAGuQeNH3u0yaoBqIIFUubdVmm0PAYlunN4j8

### Make sure

- if urls are localhost then make user my application is running
- OR you can see https://jaiminpatel345.github.io/docs where I must put live urls ( Thanks for cooperation )
