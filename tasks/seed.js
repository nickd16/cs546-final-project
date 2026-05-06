import {readFile} from 'fs/promises';
import {dbConnection, closeConnection} from '../config/mongoConnection.js'
import {user, location, forum, report, locationRequest} from '../config/mongoCollections.js';
import {ObjectId} from 'mongodb';

const main = async () => {
    const db = await dbConnection();
    await db.dropDatabase();

    const locationFile = new URL('../dataset/unified_dataset.json', import.meta.url);
    const locationData = JSON.parse(await readFile(locationFile, 'utf8'));
    let sampleLocations = locationData.map((locationDoc) => ({
        _id: new ObjectId(locationDoc._id),
        dateTimeCreated: new Date(locationDoc.dateTimeCreated),
        locationType: locationDoc.locationType,
        commentList: locationDoc.commentList,
        statusUpdateList: locationDoc.statusUpdateList,
        ratingList: locationDoc.ratingList,
        timeSlotList: locationDoc.timeSlotList,
        locationName: locationDoc.locationName,
        description: locationDoc.description,
        address: locationDoc.address,
        latitude: locationDoc.latitude,
        longitude: locationDoc.longitude,
        accessible: locationDoc.accessible,
        numCourts: locationDoc.numCourts,
        indoorOutdoor: locationDoc.indoorOutdoor,
        tennisType: locationDoc.tennisType,
        length: locationDoc.length,
        difficulty: locationDoc.difficulty,
        otherDetails: locationDoc.otherDetails,
        limitedAccess: locationDoc.limitedAccess
    }));
    console.log("Check " + sampleLocations[0].locationName + " for sample data!");
    const firstLocationId = sampleLocations[0]._id;
    sampleLocations[0].commentList = [{
                "_id": new ObjectId('65b7c5f8f1d423b2f8e2c1a1'),
                "dateTimeCreated": new Date("2026-04-28T10:23:00Z"),
                "userId": new ObjectId('62b7c2f4f1d5c3b2f8e4b1a1'),
                "parentId": null,
                "childrenCommentIdList": [],
                "body": "This is a comment on a location!",
                "likedUserIdList": [new ObjectId('62b7c2f4f1d5c3b2f8e4b1a1')],
                "dislikedUserIdList": [],
            }];
    sampleLocations[0].ratingList = [{
                "_id": new ObjectId('51b3c2f8f1d4c3b2f8e4b1a1'),
                "dateTimeCreated": new Date("2026-04-28T10:23:00Z"),
                "userId": new ObjectId('62b7c2f4f1d5c3b2f8e4b1a1'),
                "score": 4,
                "review": "This is a rating!",
                "likedUserIdList": [new ObjectId('62b7c2f4f1d5c3b2f8e4b1a1')],
                "dislikedUserIdList": [],
    }];
    sampleLocations[0].timeSlotList = [{
                "_id": new ObjectId('71b3c4f821d4c3b2f8e4b1a1'),
                "createdByUserId": new ObjectId('62b7c2f4f1d5c3b2f8e4b1a1'),
                "startDateTime": new Date("2026-04-05T10:30:00Z"),
                "endDateTime": new Date("2026-04-05T10:45:00Z"),
                "joinedUserIdList": [new ObjectId('62b7c2f4f1d5c3b2ffe4b1a1')]
    }];
    sampleLocations[0].statusUpdateList = [{
                "_id": new ObjectId('61b3c2f8f1d4c3b2f8e4b1a1'),
                "dateTimeCreated": new Date("2026-04-06T10:23:00Z"),
                "userId": new ObjectId('62b7c2f4f1d5c3b2f8e4b1a1'),
                "body": "This is a status update!",
                "agreedUserIdList": [new ObjectId('62b7c2f4f1d5c3b2f8e4b1a1')],
                "disagreedUserIdList": [],
    }];
    
    let samplePosts = [
        { 
            "_id": new ObjectId('62b7c2f8f135c5b2f8e4b1a1'),
            "catagory": "all",
            "dateTimeCreated": new Date("2024-11-28T10:20:00Z"),
            "userId": new ObjectId('62b7c2f4f1d5c3b2f8e4b1a1'),
            "commentList": [{
                "_id": new ObjectId('65b7c5f8f1d423b2f8e2b1a1'),
                "dateTimeCreated": new Date("2024-11-28T10:23:00Z"),
                "userId": new ObjectId('62b7c2f4f1d5c3b2f8e4b1a1'),
                "parentId": null,
                "childrenCommentIdList": [],
                "body": "This is a comment!",
                "likedUserIdList": [new ObjectId('62b7c2f4f1d5c3b2f8e4b1a1')],
                "dislikedUserIdList": [],
            },
            {
                "_id": new ObjectId('65b7c5f8f1a423b2f9e2b1a1'),
                "dateTimeCreated": new Date("2024-11-28T10:25:00Z"),
                "userId": new ObjectId('62b7c2f4f1d5c3b2f8e4b1a1'),
                "parentId": new ObjectId('65b7c5f8f1d423b2f8e2b1a1'),
                "childrenCommentIdList": [],
                "body": "This is a comment reply to another comment!",
                "likedUserIdList": [new ObjectId('62b7c2f4f1d5c3b2f8e4b1a1')],
                "dislikedUserIdList": [],
            },
            {
                "_id": new ObjectId('65b7c5f8f1a423b2f9a2b1a6'),
                "dateTimeCreated": new Date("2024-11-28T10:27:00Z"),
                "userId": new ObjectId('62b7c2f4f1d5c3b2f8e4b1a1'),
                "parentId": new ObjectId('65b7c5f8f1a423b2f9e2b1a1'),
                "childrenCommentIdList": [],
                "body": "This is a comment reply to another comment but again!",
                "likedUserIdList": [new ObjectId('62b7c2f4f1d5c3b2f8e4b1a1')],
                "dislikedUserIdList": [],
            },
            {
                "_id": new ObjectId('65b7c5f8f1a423b2f9a3b1a6'),
                "dateTimeCreated": new Date("2024-11-28T10:30:00Z"),
                "userId": new ObjectId('62b7c2f4f1d5c3b2f8e4b1a1'),
                "parentId": new ObjectId('65b7c5f8f1a423b2f9a2b1a6'),
                "childrenCommentIdList": [],
                "body": "This is a comment reply to another comment but again, again!",
                "likedUserIdList": [new ObjectId('62b7c2f4f1d5c3b2f8e4b1a1')],
                "dislikedUserIdList": [],
            },
            {
                "_id": new ObjectId('65b7c5f8f1a423b2a9a3b1a6'),
                "dateTimeCreated": new Date("2024-11-28T10:35:00Z"),
                "userId": new ObjectId('62b7c2f4f1d5c3b2f8e4b1a1'),
                "parentId": new ObjectId('65b7c5f8f1a423b2f9a3b1a6'),
                "childrenCommentIdList": [],
                "body": "This is a comment reply to another comment but again, again, again!",
                "likedUserIdList": [new ObjectId('62b7c2f4f1d5c3b2f8e4b1a1')],
                "dislikedUserIdList": [],
            }],
            "title": "This is a post title!",
            "body": "This is a post!",
            "likedUserIdList": [new ObjectId('62b7c2f4f1d5c3b2f8e4b1a1')],
            "dislikedUserIdList": []
        },
    ];

    let sampleUsers = [
        { 
            "_id": new ObjectId('62b7c2f4f1d5c3b2f8e4b1a1'),
            "dateTimeCreated": new Date("2024-03-29T12:30:00Z"),
            "username": "admin",
            "hashedPassword": "$2b$10$07fW3Rl0/IWtJO7QY9Wufu70C/HUjps5YC7M0QBGQe9Gm.QN.3SNG",
            "favLocationIds": [firstLocationId],
            "isAdmin": true
        },
        { 
            "_id": new ObjectId('62b7c2f4f1d5c3b2ffe4b1a1'),
            "dateTimeCreated": new Date("2024-03-29T12:30:00Z"),
            "username": "bob",
            "hashedPassword": "$2b$10$07fW3Rl0/IWtJO7QY9Wufu70C/HUjps5YC7M0QBGQe9Gm.QN.3SNG",
            "favLocationIds": [],
            "isAdmin": false
        },
    ];

    let sampleReports = [
        { 
            "_id": new ObjectId('62b7c3f8f1d4c3b2f8e4b1b1'),
            "dateTimeCreated": new Date("2024-03-29T12:30:00Z"),
            "status": "waiting",
            "dateReviewedAt": null,
            "forumOrLocation": "forum",
            "typeOfContent": "post",
            "userId": new ObjectId('62b7c2f4f1d5c3b2ffe4b1a1'),
            "contentId": new ObjectId('62b7c2f8f135c5b2f8e4b1a1'),
            "locationOrForumId": new ObjectId('62b7c2f8f135c5b2f8e4b1a1'),
            "reportReason": "spam",
            "body": "Sample report description text for post on forum."
        },
        { 
            "_id": new ObjectId('62b7c3f8f1d4c3b2f8e4b1a1'),
            "dateTimeCreated": new Date("2024-03-29T12:30:00Z"),
            "status": "waiting",
            "dateReviewedAt": null,
            "forumOrLocation": "forum",
            "typeOfContent": "comment",
            "userId": new ObjectId('62b7c2f4f1d5c3b2ffe4b1a1'),
            "contentId": new ObjectId('65b7c5f8f1a423b2a9a3b1a6'),
            "locationOrForumId": new ObjectId('62b7c2f8f135c5b2f8e4b1a1'),
            "reportReason": "spam",
            "body": "Sample report description text for comment on forum."
        },
        { 
            "_id": new ObjectId('62b7c3f8f1d4c3b6f9e4b1a1'),
            "dateTimeCreated": new Date("2026-03-29T12:35:00Z"),
            "status": "waiting",
            "dateReviewedAt": null,
            "forumOrLocation": "location",
            "typeOfContent": "comment",
            "userId": new ObjectId('62b7c2f4f1d5c3b2ffe4b1a1'),
            "contentId": new ObjectId('65b7c5f8f1d423b2f8e2c1a1'),
            "locationOrForumId": new ObjectId(firstLocationId),
            "reportReason": "spam",
            "body": "Sample report description text for comment on location."
        }
    ];

    let sampleLocationRequests = [
        { 
            "_id": new ObjectId('62b7c3f8fcd4c3b2f8e4b1a1'),
            "dateTimeCreated": new Date("2024-03-29T12:30:00Z"),
            "dateTimeAcceptedRejected": null,
            "status": "waiting",
            "locationType": "basketball",
            "userId": new ObjectId('62b7c2f4f1d5c3b2ffe4b1a1'),
            "body": "This is a location request!",
            "locationName": "52 Playground",
            "description": "This is a description!",
            "address": "Kelly St. & Ave. St. John",
            "latitude": 40.8149,
            "longitude": -73.9021,
            "accessible": false,
            "numCourts": null,
            "indoorOutdoor": null,
            "tennisType": null,
            "length": null,
            "difficulty": null,
            "otherDetails": null,
            "limitedAccess": null
        },
    ];

    const userCollection = await user();
    const locationCollection = await location();
    const forumCollection = await forum();
    const reportCollection = await report();
    const locationRequestCollection = await locationRequest();

    await userCollection.insertMany(sampleUsers);
    await locationCollection.insertMany(sampleLocations);
    await forumCollection.insertMany(samplePosts);
    await reportCollection.insertMany(sampleReports);
    await locationRequestCollection.insertMany(sampleLocationRequests);

    console.log('Seeded database');
    await closeConnection();


}

main()
