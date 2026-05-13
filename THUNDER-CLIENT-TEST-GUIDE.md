# ============================================================================
# WATTSAPP BACKEND — THUNDER CLIENT TESTING GUIDE
# ============================================================================
# Base URL: http://localhost:5000/api/v1
#
# IMPORT: Save this as thunder-collection.json and import in Thunder Client
# VS Code extension.
#
# HOW TO USE:
#   1. Install Thunder Client extension in VS Code
#   2. Open Thunder Client panel (Ctrl+Shift+P → "Thunder Client: Open")
#   3. Click hamburger menu → "Import from file"
#   4. Select this file
#   5. Replace <TOKEN>, <USER_ID>, <CONV_ID>, etc. with actual values
#   6. Run requests sequentially — follow the numbered order!
#
# FLOW:
#   Register → Verify OTP → Login → Get Profile → Create Conversation
#   → Send Messages → Test Groups → Test Blocks → Test Errors
# ============================================================================


# ===== STEP 1: HEALTH CHECK =====

1. Health Check
GET http://localhost:5000/



# ===== PHASE 1: AUTHENTICATION (No token needed) =====

2. Register New User
POST http://localhost:5000/api/v1/auth/register
Content-Type: application/json

{
  "phone": "+923001112222",
  "countryCode": "92",
  "password": "TestPass1234",
  "displayName": "Test User 1"
}
> NOTE: Check server console for OTP (in dev mode, OTP = 123456)


3. Verify OTP
POST http://localhost:5000/api/v1/auth/verify-otp
Content-Type: application/json

{
  "phone": "+923001112222",
  "otp": "123456"
}
> RESPONSE CONTAINS: accessToken — SAVE THIS as <TOKEN>


4. Login
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json

{
  "phone": "+923001112222",
  "countryCode": "92",
  "password": "TestPass1234"
}
> Also returns accessToken


5. Resend OTP
POST http://localhost:5000/api/v1/auth/resend-otp
Content-Type: application/json

{
  "phone": "+923001112222"
}


6. Forgot Password
POST http://localhost:5000/api/v1/auth/forgot-password
Content-Type: application/json

{
  "phone": "+923001112222",
  "countryCode": "92"
}


7. Reset Password
POST http://localhost:5000/api/v1/auth/reset-password
Content-Type: application/json

{
  "phone": "+923001112222",
  "countryCode": "92",
  "otp": "123456",
  "newPassword": "NewPass9999"
}


# ===== PHASE 2: PROFILE (Requires Bearer Token) =====

8. Get My Profile
GET http://localhost:5000/api/v1/auth/profile
Authorization: Bearer <TOKEN>


9. Update Profile
PATCH http://localhost:5000/api/v1/auth/profile
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "displayName": "Updated Name"
}


10. Delete My Account
DELETE http://localhost:5000/api/v1/auth/account
Authorization: Bearer <TOKEN>


11. Logout
POST http://localhost:5000/api/v1/auth/logout
Authorization: Bearer <TOKEN>


# ===== PHASE 3: CONVERSATIONS (Requires Bearer Token) =====

12. Get All Conversations
GET http://localhost:5000/api/v1/messages/conversations?page=1&limit=30
Authorization: Bearer <TOKEN>


13. Create Conversation
POST http://localhost:5000/api/v1/messages/conversations
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "receiverId": "<USER_ID>"
}
> Save conversation ID as <CONV_ID>


14. Get Single Conversation
GET http://localhost:5000/api/v1/messages/conversations/<CONV_ID>
Authorization: Bearer <TOKEN>


15. Delete Conversation
DELETE http://localhost:5000/api/v1/messages/conversations/<CONV_ID>
Authorization: Bearer <TOKEN>


# ===== PHASE 4: MESSAGES (Requires Bearer Token) =====

16. Send Text Message
POST http://localhost:5000/api/v1/messages/<CONV_ID>
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "text": "Hello from Thunder Client!",
  "replyTo": "<optional-message-id>"
}


17. Get Messages
GET http://localhost:5000/api/v1/messages/<CONV_ID>?cursor=0&limit=50
Authorization: Bearer <TOKEN>


18. Edit Message
PATCH http://localhost:5000/api/v1/messages/<CONV_ID>/<MSG_ID>
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "text": "This message was edited"
}


19. Delete Message
DELETE http://localhost:5000/api/v1/messages/<CONV_ID>/<MSG_ID>
Authorization: Bearer <TOKEN>


20. Add Reaction
POST http://localhost:5000/api/v1/messages/messages/<MSG_ID>/reaction
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "emoji": "👍"
}


21. Remove Reaction
DELETE http://localhost:5000/api/v1/messages/messages/<MSG_ID>/reaction
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "emoji": "👍"
}


22. Mark All Messages as Read (in conversation)
POST http://localhost:5000/api/v1/messages/<CONV_ID>/read
Authorization: Bearer <TOKEN>
Content-Type: application/json

{}


23. Upload Media
POST http://localhost:5000/api/v1/messages/conversations/<CONV_ID>/media
Authorization: Bearer <TOKEN>
Content-Type: multipart/form-data

formData: file = Select image/video/document


# ===== PHASE 5: GROUPS (Requires Bearer Token) =====

24. Get My Groups
GET http://localhost:5000/api/v1/groups
Authorization: Bearer <TOKEN>


25. Create Group
POST http://localhost:5000/api/v1/groups
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "name": "My Test Group",
  "description": "Created via Thunder Client",
  "participantIds": ["<USER_ID_1>", "<USER_ID_2>"],
  "isPublic": true
}
> Save group ID as <GROUP_ID>


26. Get Group Details
GET http://localhost:5000/api/v1/groups/<GROUP_ID>
Authorization: Bearer <TOKEN>


27. Update Group
PATCH http://localhost:5000/api/v1/groups/<GROUP_ID>
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "name": "Updated Group Name",
  "description": "Updated description"
}


28. Add Members to Group
POST http://localhost:5000/api/v1/groups/<GROUP_ID>/members
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "memberIds": ["<USER_ID_3>"]
}


29. Remove Member from Group
DELETE http://localhost:5000/api/v1/groups/<GROUP_ID>/members/<MEMBER_ID>
Authorization: Bearer <TOKEN>


30. Promote to Admin
POST http://localhost:5000/api/v1/groups/<GROUP_ID>/admins/<MEMBER_ID>
Authorization: Bearer <TOKEN>


31. Demote Admin
DELETE http://localhost:5000/api/v1/groups/<GROUP_ID>/admins/<MEMBER_ID>
Authorization: Bearer <TOKEN>


32. Transfer Group Ownership
POST http://localhost:5000/api/v1/groups/<GROUP_ID>/owner
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "nextOwnerId": "<USER_ID>"
}


33. Leave Group
POST http://localhost:5000/api/v1/groups/<GROUP_ID>/leave
Authorization: Bearer <TOKEN>


# ===== PHASE 6: BLOCKED USERS (Requires Bearer Token) =====

34. Get Blocked Users
GET http://localhost:5000/api/v1/blocks
Authorization: Bearer <TOKEN>


35. Block User
POST http://localhost:5000/api/v1/blocks
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "blockedUserId": "<USER_ID>"
}


36. Unblock User
DELETE http://localhost:5000/api/v1/blocks/<BLOCKED_USER_ID>
Authorization: Bearer <TOKEN>


# ===== PHASE 7: ERROR HANDLING =====

37. Test 401 — No Token
GET http://localhost:5000/api/v1/auth/profile


38. Test 404 — Invalid Route
GET http://localhost:5000/api/v1/nonexistent
Authorization: Bearer <TOKEN>


# ============================================================================
# EXPECTED RESPONSE FORMATS
# ============================================================================

# Success:
{
  "success": true,
  "statusCode": 200,
  "message": "...",
  "data": { ... }
}

# Error:
{
  "success": false,
  "statusCode": 400,
  "message": "...",
  "data": null
}

# Token from OTP Verification:
{
  "success": true,
  "statusCode": 200,
  "message": "Phone number verified successfully",
  "data": {
    "accessToken": "eyJhbGci...",
    "user": {
      "id": "...",
      "phone": "...",
      "displayName": "...",
      "isVerified": true,
      "isActive": true,
      "role": "user"
    }
  }
}

# Message from server console (dev mode):
# OTP for +923001112222: 123456

# ============================================================================
# TOKEN LIFECYCLE
# ============================================================================
# Access Token:  15 minutes (sent in response body)
# Refresh Token: 7 days (sent as HTTP-only cookie)
# To refresh: POST /auth/refresh-token (with refreshToken cookie)
# To logout:   POST /auth/logout (clears cookie + blacklists tokens)