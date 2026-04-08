import { locationRequest } from '../config/mongoCollections.js';
import { user } from '../config/mongoCollections.js';
import { ObjectId } from 'mongodb';
import { validateIdField } from '../helpers.js';

const normalizeUserIdString = (userId) => {
  if (userId && typeof userId === 'object' && typeof userId.toString === 'function') return userId.toString();
  return String(userId);
};

export const getWaitingRequestsForAdmin = async () => {
  const requestCollection = await locationRequest();
  return requestCollection.find({ status: 'waiting' }).sort({ dateTimeCreated: -1 }).toArray();
};

export const createLocationRequest = async(reporterUserId) => {
    /** TODO */

    /** create location request from user */

    return;
}

export const acceptLocationRequest = async(requestId, adminUserId) => {
    /** TODO */
    
    /** accept lcoation request */

    /** add location object to location collection */

    return;
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

