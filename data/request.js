import { locationRequest } from '../config/mongoCollections.js';
import { user } from '../config/mongoCollections.js';
import { ObjectId } from 'mongodb';
import { validateIdField } from '../helpers.js';
import { createLocationFromRequest } from './location.js';
import { getUserById } from "./user.js";

const normalizeUserIdString = (userId) => {
  if (userId && typeof userId === 'object' && typeof userId.toString === 'function') return userId.toString();
  return String(userId);
};

export const getWaitingRequestsForAdmin = async () => {
  const requestCollection = await locationRequest();
  return requestCollection.find({ status: 'waiting' }).map(async (reqEntry) => {
    reqEntry["username"] = (await getUserById(reqEntry["userId"].toString()))["username"]; // Give the front end usernames to render
    return reqEntry;
  }).sort({ dateTimeCreated: -1 }).toArray();
};

export const createBasketballLocationRequest = async(requestObj, userId) => {
    /** Helper function to specifically create basketball request */

    let cleanLat = parseFloat(requestObj.latitude);
    let cleanLong = parseFloat(requestObj.longitude);

    if (isNaN(cleanLat) || isNaN(cleanLong)) throw new Error('Invalid Latitude or Longitude Value');

    let isAccessible = false;
    if (Object.hasOwn(requestObj, "accessible")) isAccessible = true;

    let numCourts = null;
    if (requestObj.numCourts != "") {
        numCourts = Number(requestObj.numCourts);
        if (isNaN(numCourts)) throw new Error('Invalid number of courts');

        if (numCourts < 0) throw new Error("Number of courts can not be negative");
    }

    let basketballReq = {
        dateTimeCreated: new Date(),
        dateTimeAcceptedRejected: null,
        status: "waiting",
        locationType: "basketball",
        userId: new ObjectId(userId),
        body: requestObj.body,
        locationName: requestObj.locationName,
        description: requestObj.description,
        address: requestObj.address,
        latitude: cleanLat,
        longitude: cleanLong,
        accessible: isAccessible,
        numCourts: numCourts,
        indoorOutdoor: null,
        tennisType: null,
        length: null,
        difficulty: null,
        otherDetails: null,
        limitedAccess: null
    }

    let requestCollection = await locationRequest();

    await requestCollection.insertOne(basketballReq);
    return true;
}

export const createTennisLocationRequest = async(requestObj, userId) => {
    /** Helper function to specifically create tennis request */

    let cleanLat = parseFloat(requestObj.latitude);
    let cleanLong = parseFloat(requestObj.longitude);

    if (isNaN(cleanLat) || isNaN(cleanLong)) throw new Error('Invalid Latitude or Longitude Value');

    let isAccessible = false;
    if (Object.hasOwn(requestObj, "accessible")) isAccessible = true;

    let numCourts = null;
    if (requestObj.numCourts != "") {
        numCourts = Number(requestObj.numCourts);
        if (isNaN(numCourts)) throw new Error('Invalid number of courts');

        if (numCourts < 0) throw new Error("Number of courts can not be negative");
    }

    let indoorOutdoor = null;
    if (Object.hasOwn(requestObj, "indoorOutdoor")) indoorOutdoor = requestObj.indoorOutdoor; // check if indoorOutdoor key is not present

    let tennisType = null;
    if (requestObj.tennisType.trim() != '') tennisType = requestObj.tennisType.trim();

    let tennisReq = {
        dateTimeCreated: new Date(),
        dateTimeAcceptedRejected: null,
        status: "waiting",
        locationType: "tennis",
        userId: new ObjectId(userId),
        body: requestObj.body,
        locationName: requestObj.locationName,
        description: requestObj.description,
        address: requestObj.address,
        latitude: cleanLat,
        longitude: cleanLong,
        accessible: isAccessible,
        numCourts: numCourts,
        indoorOutdoor: indoorOutdoor,
        tennisType: tennisType,
        length: null,
        difficulty: null,
        otherDetails: null,
        limitedAccess: null
    }

    let requestCollection = await locationRequest();

    await requestCollection.insertOne(tennisReq);
    return true;
}

export const createHandballLocationRequest = async(requestObj, userId) => {
    /** Helper function to specifically create handball request */

    let cleanLat = parseFloat(requestObj.latitude);
    let cleanLong = parseFloat(requestObj.longitude);

    if (isNaN(cleanLat) || isNaN(cleanLong)) throw new Error('Invalid Latitude or Longitude Value');

    let numCourts = null;
    if (requestObj.numCourts.trim() != "") {
        numCourts = Number(requestObj.numCourts.trim());
        if (isNaN(numCourts)) throw new Error('Invalid number of courts');

        if (numCourts < 0) throw new Error("Number of courts can not be negative");
    }

    let handballReq = {
        dateTimeCreated: new Date(),
        dateTimeAcceptedRejected: null,
        status: "waiting",
        locationType: "handball",
        userId: new ObjectId(userId),
        body: requestObj.body,
        locationName: requestObj.locationName,
        description: requestObj.description,
        address: requestObj.address,
        latitude: cleanLat,
        longitude: cleanLong,
        accessible: null,
        numCourts: numCourts,
        indoorOutdoor: null,
        tennisType: null,
        length: null,
        difficulty: null,
        otherDetails: null,
        limitedAccess: null
    }

    let requestCollection = await locationRequest();

    await requestCollection.insertOne(handballReq);
    return true;
}

export const createHikingLocationRequest = async(requestObj, userId) => {
    /** Helper function to specifically create hiking request */

    let cleanLat = parseFloat(requestObj.latitude);
    let cleanLong = parseFloat(requestObj.longitude);

    if (isNaN(cleanLat) || isNaN(cleanLong)) throw new Error('Invalid Latitude or Longitude Value');

    let isAccessible = false;
    if (Object.hasOwn(requestObj, "accessible")) isAccessible = true;

    let length = null;
    if (requestObj.length.trim() != '') length = requestObj.length.trim();

    let difficulty = null;
    if (requestObj.difficulty.trim() != '') difficulty = requestObj.difficulty.trim();

    let otherDetails = null;
    if (requestObj.otherDetails.trim() != '') otherDetails = requestObj.otherDetails.trim();

    let limitedAccess = null;
    if (requestObj.limitedAccess.trim() != '') limitedAccess = requestObj.limitedAccess.trim();

    let hikingReq = {
        dateTimeCreated: new Date(),
        dateTimeAcceptedRejected: null,
        status: "waiting",
        locationType: "hiking",
        userId: new ObjectId(userId),
        body: requestObj.body,
        locationName: requestObj.locationName,
        description: requestObj.description,
        address: requestObj.address,
        latitude: cleanLat,
        longitude: cleanLong,
        accessible: isAccessible,
        numCourts: null,
        indoorOutdoor: null,
        tennisType: null,
        length: length,
        difficulty: difficulty,
        otherDetails: otherDetails,
        limitedAccess: limitedAccess
    }

    let requestCollection = await locationRequest();

    await requestCollection.insertOne(hikingReq);
    return true;
}

export const createLocationRequest = async(requestObj, reporterUserId) => {
    try {
        const userIdStr = normalizeUserIdString(reporterUserId);
        await validateIdField(userIdStr);
    
        /** create location request from user */
    
        switch (requestObj.categoryFilter) {
            case "basketball":
                await createBasketballLocationRequest(requestObj, userIdStr);
                break;
            case "tennis":
                await createTennisLocationRequest(requestObj, userIdStr);
                break;
            case "handball":
                await createHandballLocationRequest(requestObj, userIdStr);
                break;
            case "hiking":
                await createHikingLocationRequest(requestObj, userIdStr);
                break
            default:
                throw new Error("Invalid Category!");
        }
        
        return true;
    } catch (e) {
        throw e;
    }

}

export const acceptLocationRequest = async(requestId, adminUserId) => {
    
    requestId = await validateIdField(requestId);
    const adminIdStr = normalizeUserIdString(adminUserId);
    await validateIdField(adminIdStr);

    /** verify admin role */
    const userCollection = await user();
    const u = await userCollection.findOne({_id: new ObjectId(adminIdStr)});
    if (!u.isAdmin) {
        throw new Error('Invalid operation: Admin permission required');
    }

    const requestCollection = await locationRequest();
    const r = await requestCollection.findOne({ _id: new ObjectId(requestId) });
    if (!r) throw new Error('Request not found');
    if (r.status !== 'waiting') throw new Error('Request already reviewed');

    await requestCollection.updateOne(
        { _id: new ObjectId(requestId) },
        // Can add if needed: reviewedByAdminUserId: new ObjectId(adminIdStr),
        { $set: { status: 'accepted', dateTimeAcceptedRejected: new Date()} },
    );

    /** add location object to location collection */

    try {
        await createLocationFromRequest(r);
    }
    catch (e) {
        throw e;
    }

    return true;
}

export const rejectLocationRequest = async (requestId, adminUserId) => {
    /** deny the location request, change status to rejected, do not touch the location collection */
  requestId = await validateIdField(requestId);
  const adminIdStr = normalizeUserIdString(adminUserId);
  await validateIdField(adminIdStr);

  /** verify admin role */
  const userCollection = await user();
  const u = await userCollection.findOne({_id: new ObjectId(adminIdStr)});
  if (!u.isAdmin) {
    throw new Error('Invalid operation: Admin permission required');
  }

  const requestCollection = await locationRequest();
  const r = await requestCollection.findOne({ _id: new ObjectId(requestId) });
  if (!r) throw new Error('Request not found');
  if (r.status !== 'waiting') throw new Error('Request already reviewed');

  await requestCollection.updateOne(
    { _id: new ObjectId(requestId) },
    // Can add if needed: reviewedByAdminUserId: new ObjectId(adminIdStr),
    { $set: { status: 'rejected', dateTimeAcceptedRejected: new Date()} },
  );
  return true;
};

