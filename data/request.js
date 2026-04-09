import { locationRequest } from '../config/mongoCollections.js';
import { user } from '../config/mongoCollections.js';
import { ObjectId } from 'mongodb';
import { validateIdField } from '../helpers.js';
import { createLocationFromRequest } from './location.js';

const normalizeUserIdString = (userId) => {
  if (userId && typeof userId === 'object' && typeof userId.toString === 'function') return userId.toString();
  return String(userId);
};

export const getWaitingRequestsForAdmin = async () => {
  const requestCollection = await locationRequest();
  return requestCollection.find({ status: 'waiting' }).sort({ dateTimeCreated: -1 }).toArray();
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

export const createLocationRequest = async(requestObj, reporterUserId) => {

    const userIdStr = normalizeUserIdString(reporterUserId);
    await validateIdField(userIdStr);

    /** create location request from user */

    switch (requestObj.categoryFilter) {
        case "basketball":
            createBasketballLocationRequest(requestObj, userIdStr);
            break;
        case "tennis":
            break;
        case "handball":
            break;
        case "hiking":
            break

        default:
            throw new Error("Invalid Category!");
    }

    return true;
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

