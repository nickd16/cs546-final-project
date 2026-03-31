import {dbConnection, closeConnection} from '../config/mongoConnection.js'
import {user, location, forum, report, locationRequest} from '../config/mongoCollections.js';
import {ObjectId} from 'mongodb';

const main = async () => {
    const db = await dbConnection();
    await db.dropDatabase();

    
    let sampleLocations = [
        { 
            "_id": new ObjectId('62b7c2f8f1d4c3b2f8e4b1a1'),
            "dateTimeCreated": new Date("2024-10-28T10:21:00Z"),
            "locationType": "basketball",
            "commentList": [{
                "_id": new ObjectId('65b7c2f8f1d4c3b2f8e2b1a1'),
                "dateTimeCreated": new Date("2024-10-28T10:23:00Z"),
                "userId": new ObjectId('62b7c2f8f1d4c3b2f8e4b1a1'),
                "parentId": null,
                "childrenCommentIdList": [],
                "body": "This is a comment!",
                "likedUserIdList": [new ObjectId('62b7c2f8f1d4c3b2f8e4b1a1')],
                "dislikedUserIdList": [],
            }],
            "statusUpdateList": [{
                "_id": new ObjectId('61b3c2f8f1d4c3b2f8e4b1a1'),
                "dateTimeCreated": new Date("2024-10-28T10:23:00Z"),
                "userId": new ObjectId('62b7c2f8f1d4c3b2f8e4b1a1'),
                "title": "This is the title of a status update!",
                "body": "This is a status update!",
                "likedUserIdList": [new ObjectId('62b7c2f8f1d4c3b2f8e4b1a1')],
                "dislikedUserIdList": [],
            }],
            "ratingList": [{
                "_id": new ObjectId('51b3c2f8f1d4c3b2f8e4b1a1'),
                "dateTimeCreated": new Date("2024-10-28T10:23:00Z"),
                "userId": new ObjectId('62b7c2f8f1d4c3b2f8e4b1a1'),
                "ratingOutOfFiveStars": 4,
                "title": "This is the rating title!",
                "body": "This is a rating!",
                "likedUserIdList": [new ObjectId('62b7c2f8f1d4c3b2f8e4b1a1')],
                "dislikedUserIdList": [],
            }],
            "timeSlotList": [{
                "_id": new ObjectId('71b3c2f821d4c3b2f8e4b1a1'),
                "startDateTime": new Date("2025-03-29T10:30:00Z"),
                "listOfSignedUpUserIds": [new ObjectId('62b7c2f8f1d4c3b2f8e4b1a1')]
            }],
            "locationName": "Captain William Harry Thompson Playground",
            "description": "This is a description!",
            "address": "E 174 St. & Bronx River Ave.",
            "latitude": 40.8342,
            "longitude": -73.8775,
            "accessible": false,
            "numCourts": null,
            "indoorOutdoor": null,
            "tennisType": null,
            "length": null,
            "difficulty": null,
            "otherDetails": null,
            "limitedAccess": null,
        },
    ];
    let samplePosts = [
        { 
            "_id": new ObjectId('62b7c2f8f135c5b2f8e4b1a1'),
            "catagory": "all",
            "dateTimeCreated": new Date("2026-03-29T12:30:00Z"),
            "userId": new ObjectId('62b7c2f8f1d4c3b2f8e4b1a1'),
            "commentList": [{
                "_id": new ObjectId('65b7c5f8f1d423b2f8e2b1a1'),
                "dateTimeCreated": new Date("2024-11-28T10:23:00Z"),
                "userId": new ObjectId('62b7c2f8f1d4c3b2f8e4b1a1'),
                "parentId": null,
                "childrenCommentIdList": [],
                "body": "This is a comment!",
                "likedUserIdList": [new ObjectId('62b7c2f8f1d4c3b2f8e4b1a1')],
                "dislikedUserIdList": [],
            }],
            "title": "This is a post title!",
            "body": "This is a post!",
            "likedUserIdList": [new ObjectId('62b7c2f8f1d4c3b2f8e4b1a1')],
            "dislikedUserIdList": []
        },
    ];

    let sampleUsers = [
        { 
            "_id": new ObjectId('62b7c2f4f1d5c3b2f8e4b1a1'),
            "dateTimeCreated": new Date("2024-03-29T12:30:00Z"),
            "username": "admin",
            "hashedPassword": "$2b$10$JaqSX0wjHVxa2mK550HEZeHa7YRT9kdWgydwvhYNqeQb/wsihMxeC",
            "favLocationIds": [new ObjectId('62b7c2f8f1d4c3b2f8e4b1a1')],
            "isAdmin": true
        },
        { 
            "_id": new ObjectId('62b7c2f4f1d5c3b2ffe4b1a1'),
            "dateTimeCreated": new Date("2024-03-29T12:30:00Z"),
            "username": "bob",
            "hashedPassword": "$2b$10$JaqSX0wjHVxa2mK550HEZeHa7YRT9kdWgydwvhYNqeQb/wsihMxeC",
            "favLocationIds": [],
            "isAdmin": false
        },
    ];

    let sampleReports = [
        { 
            "_id": new ObjectId('62b7c3f8f1d4c3b2f8e4b1a1'),
            "dateTimeCreated": new Date("2024-03-29T12:30:00Z"),
            "status": "waiting",
            "dateReviewedAt": null,
            "forumOrLocation": "location",
            "typeOfContent": "comment",
            "userId": new ObjectId('62b7c2f4f1d5c3b2ffe4b1a1'),
            "contentId": new ObjectId('65b7c2f8f1d4c3b2f8e2b1a1'),
            "locationOrForumId": new ObjectId('62b7c2f8f1d4c3b2f8e4b1a1'),
            "body": "This is a report!"
        },
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
