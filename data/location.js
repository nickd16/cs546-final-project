import {location, user as userCollectionFn} from '../config/mongoCollections.js';
import {ObjectId} from 'mongodb';
import {validateIdField} from '../helpers.js';

const LOCATION_TYPES = ['all', 'basketball', 'handball', 'hiking', 'tennis'];

const emptyIfMissing = (arr) => {
  if (!arr) return [];
  return arr;
};

const normalizeTypeFilter = (locationTypeFilter) => {
  let filter = 'all';
  if (typeof locationTypeFilter === 'string') filter = locationTypeFilter.trim().toLowerCase();
  if (!LOCATION_TYPES.includes(filter)) filter = 'all';
  return filter;
};

const normalizeUserIdString = (userId) => {
  if (userId && typeof userId === 'object' && typeof userId.toString === 'function') return userId.toString();
  return String(userId || '').trim();
};

const parseStringField = (value, fieldName, required = false) => {
  if (value === undefined || value === null) {
    if (required) throw new Error(fieldName + ' is required');
    return null;
  }
  if (typeof value !== 'string') throw new Error(fieldName + ' must be a string');
  const trimmed = value.trim();
  if (!trimmed) {
    if (required) throw new Error(fieldName + ' is required');
    return null;
  }
  return trimmed;
};

const parseOptionalNumberField = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  if (Number.isNaN(num)) throw new Error(fieldName + ' must be a valid number');
  return num;
};

const parseOptionalIntegerField = (value, fieldName) => {
  const num = parseOptionalNumberField(value, fieldName);
  if (num === null) return null;
  if (!Number.isInteger(num)) throw new Error(fieldName + ' must be a whole number');
  return num;
};

const parseOptionalBooleanField = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (value === true || value === 'true' || value === 'on') return true;
  if (value === false || value === 'false') return false;
  return null;
};

const parseDateField = (value, fieldName) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(fieldName + ' is required');
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) throw new Error(fieldName + ' is invalid');
  return dt;
};

const getUsernamesByIds = async (idStrings) => {
  const cleaned = [];
  for (let i = 0; i < idStrings.length; i++) {
    const value = String(idStrings[i] || '').trim();
    if (value && cleaned.indexOf(value) === -1) cleaned.push(value);
  }

  if (!cleaned.length) return {};

  const userCollection = await userCollectionFn();
  const objectIds = [];
  for (let i = 0; i < cleaned.length; i++) {
    if (ObjectId.isValid(cleaned[i])) objectIds.push(new ObjectId(cleaned[i]));
  }

  const users = await userCollection.find({_id: {$in: objectIds}}).toArray();
  const out = {};
  for (let i = 0; i < users.length; i++) {
    out[users[i]._id.toString()] = users[i].username;
  }
  return out;
};

const buildDateDisplay = (value) => {
  let dateTimeISO = '';
  let dateTimeLabel = '';
  if (value instanceof Date) {
    dateTimeISO = value.toISOString();
    dateTimeLabel = value.toLocaleString();
  } else if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      dateTimeISO = parsed.toISOString();
      dateTimeLabel = parsed.toLocaleString();
    } else {
      dateTimeLabel = String(value);
    }
  }
  return {dateTimeISO, dateTimeLabel};
};

const getAverageRatingValue = (ratingList) => {
  const ratings = emptyIfMissing(ratingList);
  if (!ratings.length) return null;
  let total = 0;
  for (let i = 0; i < ratings.length; i++) total += Number(ratings[i].score || 0);
  return total / ratings.length;
};

const buildLocationCard = (loc, favoriteIdStrings) => {
  const averageRating = getAverageRatingValue(loc.ratingList);
  const avgRatingRounded = averageRating === null ? null : Number(averageRating.toFixed(1));
  const dateData = buildDateDisplay(loc.dateTimeCreated);

  return {
    _idStr: loc._id.toString(),
    dateTimeCreated: loc.dateTimeCreated,
    dateTimeISO: dateData.dateTimeISO,
    dateTimeLabel: dateData.dateTimeLabel,
    locationType: loc.locationType,
    locationName: loc.locationName,
    description: loc.description,
    address: loc.address,
    latitude: loc.latitude,
    longitude: loc.longitude,
    accessible: loc.accessible,
    numCourts: loc.numCourts,
    indoorOutdoor: loc.indoorOutdoor,
    tennisType: loc.tennisType,
    length: loc.length,
    difficulty: loc.difficulty,
    otherDetails: loc.otherDetails,
    limitedAccess: loc.limitedAccess,
    commentCount: emptyIfMissing(loc.commentList).length,
    statusUpdateCount: emptyIfMissing(loc.statusUpdateList).length,
    ratingCount: emptyIfMissing(loc.ratingList).length,
    timeSlotCount: emptyIfMissing(loc.timeSlotList).length,
    averageRating: averageRating,
    averageRatingRounded: avgRatingRounded,
    isFavorite: favoriteIdStrings.indexOf(loc._id.toString()) !== -1
  };
};

const buildLocationInput = (input, existingLocation = null) => {
  const source = input || {};
  let locationType = parseStringField(source.locationType ?? source.categoryFilter, 'Location type', true);
  locationType = locationType.toLowerCase();
  if (LOCATION_TYPES.indexOf(locationType) === -1 || locationType === 'all') throw new Error('Location type is invalid');

  const locationName = parseStringField(source.locationName, 'Location name', true);
  const description = parseStringField(source.description, 'Description', false);
  const address = parseStringField(source.address, 'Address', false);
  const latitude = parseOptionalNumberField(source.latitude, 'Latitude');
  const longitude = parseOptionalNumberField(source.longitude, 'Longitude');
  const accessible = parseOptionalBooleanField(source.accessible);
  const numCourts = parseOptionalIntegerField(source.numCourts, 'Number of courts');
  const indoorOutdoor = parseStringField(source.indoorOutdoor, 'Indoor or outdoor', false);
  const tennisType = parseStringField(source.tennisType, 'Tennis type', false);
  const length = parseStringField(source.length, 'Length', false);
  const difficulty = parseStringField(source.difficulty, 'Difficulty', false);
  const otherDetails = parseStringField(source.otherDetails, 'Other details', false);
  const limitedAccess = parseStringField(source.limitedAccess, 'Limited access', false);

  const base = {
    locationType,
    locationName,
    description,
    address,
    latitude,
    longitude,
    accessible,
    numCourts,
    indoorOutdoor,
    tennisType,
    length,
    difficulty,
    otherDetails,
    limitedAccess
  };

  if (!existingLocation) {
    base.dateTimeCreated = new Date();
    base.commentList = [];
    base.statusUpdateList = [];
    base.ratingList = [];
    base.timeSlotList = [];
  }

  return base;
};

export const getLocationById = async (id) => {
  id = await validateIdField(id);
  const locationCollection = await location();
  const foundLocation = await locationCollection.findOne({_id: new ObjectId(id)});
  if (!foundLocation) throw new Error('Location not found');
  return foundLocation;
};

export const getAllLocations = async () => {
  const locationCollection = await location();
  return locationCollection.find({}).sort({locationType: 1, locationName: 1}).toArray();
};

export const getLocationsByType = async (locationType) => {
  locationType = normalizeTypeFilter(locationType);
  if (locationType === 'all') return getAllLocations();
  const locationCollection = await location();
  return locationCollection.find({locationType}).sort({locationName: 1}).toArray();
};

export const getAllLocationsForDisplay = async (locationTypeFilter, q, currentUserId = '') => {
  let locations = await getAllLocations();
  const filter = normalizeTypeFilter(locationTypeFilter);

  let search = '';
  if (typeof q === 'string') search = q.trim().toLowerCase();

  if (filter !== 'all') {
    const filteredLocations = [];
    for (let i = 0; i < locations.length; i++) {
      if (locations[i].locationType === filter) filteredLocations.push(locations[i]);
    }
    locations = filteredLocations;
  }

  if (search) {
    const filteredLocations = [];
    for (let i = 0; i < locations.length; i++) {
      const locationName = typeof locations[i].locationName === 'string' ? locations[i].locationName.toLowerCase() : '';
      const address = typeof locations[i].address === 'string' ? locations[i].address.toLowerCase() : '';
      const description = typeof locations[i].description === 'string' ? locations[i].description.toLowerCase() : '';
      if (locationName.indexOf(search) !== -1 || address.indexOf(search) !== -1 || description.indexOf(search) !== -1) filteredLocations.push(locations[i]);
    }
    locations = filteredLocations;
  }

  let favoriteIdStrings = [];
  const currentUserIdStr = normalizeUserIdString(currentUserId);
  if (currentUserIdStr && ObjectId.isValid(currentUserIdStr)) {
    const userCollection = await userCollectionFn();
    const currentUser = await userCollection.findOne({_id: new ObjectId(currentUserIdStr)});
    if (currentUser && Array.isArray(currentUser.favLocationIds)) {
      favoriteIdStrings = currentUser.favLocationIds.map((id) => id.toString());
    }
  }

  const out = [];
  for (let i = 0; i < locations.length; i++) {
    out.push(buildLocationCard(locations[i], favoriteIdStrings));
  }
  return out;
};

export const getFavoriteLocations = async(userId) => {
  userId = await validateIdField(userId);

  /** Get favorite locations for a user, referencing favLocationIds */

  let favoriteIdStrings = [];
  const currentUserIdStr = normalizeUserIdString(userId);
  if (currentUserIdStr && ObjectId.isValid(currentUserIdStr)) {
    const userCollection = await userCollectionFn();
    const currentUser = await userCollection.findOne({_id: new ObjectId(currentUserIdStr)});
    if (currentUser && Array.isArray(currentUser.favLocationIds)) {
      favoriteIdStrings = currentUser.favLocationIds.map((id) => id.toString());
    }
  };

  /** get location details for each */

  let favoriteLocationDetails = [];
  for (let locationId of favoriteIdStrings) {
    let locationObj = await getLocationById(locationId);

    let parsedLocationObj = {
      id: locationObj._id.toString(),
      locationName: locationObj.locationName,
      locationType: locationObj.locationType,
      address: locationObj.address || locationObj.locationName,
    }
    favoriteLocationDetails.push(parsedLocationObj);
  }

  return favoriteLocationDetails;

}

export const getAllLocationsForMap = async (locationTypeFilter, q, currentUserId = '') => {
  const locations = await getAllLocationsForDisplay(locationTypeFilter, q, currentUserId);
  const out = [];
  for (let i = 0; i < locations.length; i++) {
    const loc = locations[i];
    if (typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') continue;
    out.push({
      _idStr: loc._idStr,
      locationType: loc.locationType,
      locationName: loc.locationName,
      description: loc.description,
      address: loc.address,
      latitude: loc.latitude,
      longitude: loc.longitude,
      accessible: loc.accessible,
      numCourts: loc.numCourts,
      indoorOutdoor: loc.indoorOutdoor,
      tennisType: loc.tennisType,
      length: loc.length,
      difficulty: loc.difficulty,
      commentCount: loc.commentCount,
      statusUpdateCount: loc.statusUpdateCount,
      ratingCount: loc.ratingCount,
      timeSlotCount: loc.timeSlotCount,
      averageRating: loc.averageRating,
      averageRatingRounded: loc.averageRatingRounded,
      isFavorite: loc.isFavorite
    });
  }
  return out;
};

const getDistanceMiles = (lat1, lon1, lat2, lon2) => {
  const earthRadiusMiles = 3958.8;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMiles * c;
};

export const getNearbyLocationsForMap = async (latitude, longitude, radiusMiles, locationTypeFilter, q, currentUserId = '') => {
  const lat = Number(latitude);
  const lon = Number(longitude);
  const radius = Number(radiusMiles);
  if (Number.isNaN(lat) || Number.isNaN(lon)) throw new Error('Latitude and longitude are required');
  if (Number.isNaN(radius) || radius <= 0) throw new Error('Radius must be greater than 0');

  const locations = await getAllLocationsForMap(locationTypeFilter, q, currentUserId);
  const nearbyLocations = [];

  for (let i = 0; i < locations.length; i++) {
    const location = locations[i];
    if (typeof location.latitude !== 'number' || typeof location.longitude !== 'number') continue;
    const distanceMiles = getDistanceMiles(lat, lon, location.latitude, location.longitude);
    if (distanceMiles <= radius) {
      const locationCopy = Object.assign({}, location);
      locationCopy.distanceMiles = distanceMiles;
      nearbyLocations.push(locationCopy);
    }
  }

  nearbyLocations.sort((a, b) => {
    if (a.distanceMiles !== b.distanceMiles) return a.distanceMiles - b.distanceMiles;
    return String(a.locationName || '').localeCompare(String(b.locationName || ''));
  });

  return nearbyLocations.slice(0, 75);
};

export const getLocationDetailsForDisplay = async (locationId, currentUserId = '') => {
  const loc = await getLocationById(locationId);
  const currentUserIdStr = normalizeUserIdString(currentUserId);
  const favoriteIdStrings = [];

  if (currentUserIdStr && ObjectId.isValid(currentUserIdStr)) {
    const userCollection = await userCollectionFn();
    const currentUser = await userCollection.findOne({_id: new ObjectId(currentUserIdStr)});
    if (currentUser && Array.isArray(currentUser.favLocationIds)) {
      for (let i = 0; i < currentUser.favLocationIds.length; i++) {
        favoriteIdStrings.push(currentUser.favLocationIds[i].toString());
      }
    }
  }

  const base = buildLocationCard(loc, favoriteIdStrings);
  const ratingList = emptyIfMissing(loc.ratingList);
  const statusUpdateList = emptyIfMissing(loc.statusUpdateList);
  const timeSlotList = emptyIfMissing(loc.timeSlotList);
  const commentList = emptyIfMissing(loc.commentList);

  const idStrings = [];
  for (let i = 0; i < ratingList.length; i++) idStrings.push(String(ratingList[i].userId || ''));
  for (let i = 0; i < statusUpdateList.length; i++) idStrings.push(String(statusUpdateList[i].userId || ''));
  for (let i = 0; i < commentList.length; i++) idStrings.push(String(commentList[i].userId || ''));
  const userMap = await getUsernamesByIds(idStrings);

  const ratings = [];
  for (let i = 0; i < ratingList.length; i++) {
    const rating = ratingList[i];
    const dateData = buildDateDisplay(rating.dateTimeCreated);
    const uid = String(rating.userId || '');
    ratings.push({
      _idStr: rating._id ? rating._id.toString() : '',
      userId: uid,
      authorUsername: userMap[uid] || 'Unknown',
      score: rating.score,
      review: rating.review || '',
      dateTimeISO: dateData.dateTimeISO,
      dateTimeLabel: dateData.dateTimeLabel,
      isMine: currentUserIdStr && uid === currentUserIdStr
    });
  }
  ratings.sort((a, b) => String(b.dateTimeISO).localeCompare(String(a.dateTimeISO)));

  const statuses = [];
  for (let i = 0; i < statusUpdateList.length; i++) {
    const status = statusUpdateList[i];
    const dateData = buildDateDisplay(status.dateTimeCreated);
    const uid = String(status.userId || '');
    const agreedUserIdList = emptyIfMissing(status.agreedUserIdList).map((id) => id.toString());
    const disagreedUserIdList = emptyIfMissing(status.disagreedUserIdList).map((id) => id.toString());
    let myVote = '';
    if (currentUserIdStr) {
      if (agreedUserIdList.indexOf(currentUserIdStr) !== -1) myVote = 'agree';
      if (disagreedUserIdList.indexOf(currentUserIdStr) !== -1) myVote = 'disagree';
    }
    statuses.push({
      _idStr: status._id ? status._id.toString() : '',
      userId: uid,
      authorUsername: userMap[uid] || 'Unknown',
      body: status.body || '',
      dateTimeISO: dateData.dateTimeISO,
      dateTimeLabel: dateData.dateTimeLabel,
      agreeCount: agreedUserIdList.length,
      disagreeCount: disagreedUserIdList.length,
      myVote,
      isMine: currentUserIdStr && uid === currentUserIdStr
    });
  }
  statuses.sort((a, b) => String(b.dateTimeISO).localeCompare(String(a.dateTimeISO)));

  const timeSlots = [];
  for (let i = 0; i < timeSlotList.length; i++) {
    const timeSlot = timeSlotList[i];
    const startDate = new Date(timeSlot.startDateTime);
    const endDate = new Date(timeSlot.endDateTime);
    const joinedUserIdList = emptyIfMissing(timeSlot.joinedUserIdList).map((id) => id.toString());
    timeSlots.push({
      _idStr: timeSlot._id ? timeSlot._id.toString() : '',
      startISO: Number.isNaN(startDate.getTime()) ? '' : startDate.toISOString(),
      endISO: Number.isNaN(endDate.getTime()) ? '' : endDate.toISOString(),
      startLabel: Number.isNaN(startDate.getTime()) ? '' : startDate.toLocaleString(),
      endLabel: Number.isNaN(endDate.getTime()) ? '' : endDate.toLocaleString(),
      joinedCount: joinedUserIdList.length,
      isJoined: currentUserIdStr ? joinedUserIdList.indexOf(currentUserIdStr) !== -1 : false
    });
  }
  timeSlots.sort((a, b) => String(a.startISO).localeCompare(String(b.startISO)));

  const comments = [];
  for (let i = 0; i < commentList.length; i++) {
    const comment = commentList[i];
    const dateData = buildDateDisplay(comment.dateTimeCreated);
    const uid = String(comment.userId || '');
    comments.push({
      _idStr: comment._id ? comment._id.toString() : '',
      userId: uid,
      authorUsername: userMap[uid] || 'Unknown',
      body: comment.body || '',
      dateTimeISO: dateData.dateTimeISO,
      dateTimeLabel: dateData.dateTimeLabel,
      isMine: currentUserIdStr && uid === currentUserIdStr
    });
  }
  comments.sort((a, b) => String(b.dateTimeISO).localeCompare(String(a.dateTimeISO)));

  return {
    ...base,
    ratings,
    statuses,
    timeSlots,
    comments
  };
};

export const toggleFavoriteLocationForUser = async (locationId, userId) => {
  locationId = await validateIdField(locationId);
  const userIdStr = normalizeUserIdString(userId);
  await validateIdField(userIdStr);

  await getLocationById(locationId);
  const userCollection = await userCollectionFn();
  const currentUser = await userCollection.findOne({_id: new ObjectId(userIdStr)});
  if (!currentUser) throw new Error('User not found');

  let favoriteIds = emptyIfMissing(currentUser.favLocationIds).map((id) => id.toString());
  let isFavorite = favoriteIds.indexOf(locationId) !== -1;

  if (isFavorite) {
    await userCollection.updateOne({_id: new ObjectId(userIdStr)}, {$pull: {favLocationIds: new ObjectId(locationId)}});
    isFavorite = false;
  } else {
    await userCollection.updateOne({_id: new ObjectId(userIdStr)}, {$addToSet: {favLocationIds: new ObjectId(locationId)}});
    isFavorite = true;
  }

  return isFavorite;
};

export const addLocationRating = async (locationId, userId, score, review) => {
  locationId = await validateIdField(locationId);
  const userIdStr = normalizeUserIdString(userId);
  await validateIdField(userIdStr);
  const cleanReview = parseStringField(review, 'Review', true);
  const cleanScore = Number(score);
  if (Number.isNaN(cleanScore) || !Number.isInteger(cleanScore) || cleanScore < 1 || cleanScore > 5) throw new Error('Rating score must be between 1 and 5');

  const locationCollection = await location();
  const loc = await getLocationById(locationId);
  const ratingList = emptyIfMissing(loc.ratingList).slice();
  let updated = false;

  for (let i = 0; i < ratingList.length; i++) {
    if (ratingList[i].userId && ratingList[i].userId.toString() === userIdStr) {
      ratingList[i].score = cleanScore;
      ratingList[i].review = cleanReview;
      ratingList[i].dateTimeCreated = new Date();
      updated = true;
    }
  }

  if (!updated) {
    ratingList.push({
      _id: new ObjectId(),
      dateTimeCreated: new Date(),
      userId: new ObjectId(userIdStr),
      score: cleanScore,
      review: cleanReview
    });
  }

  await locationCollection.updateOne({_id: new ObjectId(locationId)}, {$set: {ratingList}});
  return true;
};

export const addLocationComment = async (locationId, userId, body) => {
  locationId = await validateIdField(locationId);
  const userIdStr = normalizeUserIdString(userId);
  await validateIdField(userIdStr);
  const cleanBody = parseStringField(body, 'Comment', true);

  const locationCollection = await location();
  await locationCollection.updateOne(
    {_id: new ObjectId(locationId)},
    {$push: {commentList: {_id: new ObjectId(), dateTimeCreated: new Date(), userId: new ObjectId(userIdStr), body: cleanBody}}}
  );
  return true;
};

export const deleteLocationCommentByAdmin = async (locationId, commentId, adminUserId) => {
  locationId = await validateIdField(locationId);
  commentId = await validateIdField(commentId);
  const adminIdStr = normalizeUserIdString(adminUserId);
  await validateIdField(adminIdStr);

  const userCollection = await userCollectionFn();
  const adminUser = await userCollection.findOne({_id: new ObjectId(adminIdStr)});
  if (!adminUser || !adminUser.isAdmin) throw new Error('Admin access required');

  const locationCollection = await location();
  await locationCollection.updateOne(
    {_id: new ObjectId(locationId)},
    {$pull: {commentList: {_id: new ObjectId(commentId)}}}
  );
  return true;
};

export const addLocationStatus = async (locationId, userId, body) => {
  locationId = await validateIdField(locationId);
  const userIdStr = normalizeUserIdString(userId);
  await validateIdField(userIdStr);
  const cleanBody = parseStringField(body, 'Status update', true);

  const locationCollection = await location();
  await locationCollection.updateOne(
    {_id: new ObjectId(locationId)},
    {$push: {statusUpdateList: {_id: new ObjectId(), dateTimeCreated: new Date(), userId: new ObjectId(userIdStr), body: cleanBody, agreedUserIdList: [], disagreedUserIdList: []}}}
  );
  return true;
};

export const voteOnLocationStatus = async (locationId, statusId, userId, voteType) => {
  locationId = await validateIdField(locationId);
  statusId = await validateIdField(statusId);
  const userIdStr = normalizeUserIdString(userId);
  await validateIdField(userIdStr);
  const cleanVoteType = parseStringField(voteType, 'Vote type', true);
  if (cleanVoteType !== 'agree' && cleanVoteType !== 'disagree') throw new Error('Vote type is invalid');

  const locationCollection = await location();
  const loc = await getLocationById(locationId);
  const statusUpdateList = emptyIfMissing(loc.statusUpdateList).slice();
  let found = false;

  for (let i = 0; i < statusUpdateList.length; i++) {
    const status = statusUpdateList[i];
    if (status._id && status._id.toString() === statusId) {
      found = true;
      let agreedUserIdList = emptyIfMissing(status.agreedUserIdList).map((id) => id.toString());
      let disagreedUserIdList = emptyIfMissing(status.disagreedUserIdList).map((id) => id.toString());

      if (cleanVoteType === 'agree') {
        if (agreedUserIdList.indexOf(userIdStr) !== -1) agreedUserIdList = agreedUserIdList.filter((id) => id !== userIdStr);
        else agreedUserIdList.push(userIdStr);
        disagreedUserIdList = disagreedUserIdList.filter((id) => id !== userIdStr);
      } else {
        if (disagreedUserIdList.indexOf(userIdStr) !== -1) disagreedUserIdList = disagreedUserIdList.filter((id) => id !== userIdStr);
        else disagreedUserIdList.push(userIdStr);
        agreedUserIdList = agreedUserIdList.filter((id) => id !== userIdStr);
      }

      status.agreedUserIdList = agreedUserIdList.map((id) => new ObjectId(id));
      status.disagreedUserIdList = disagreedUserIdList.map((id) => new ObjectId(id));
    }
  }

  if (!found) throw new Error('Status update not found');
  await locationCollection.updateOne({_id: new ObjectId(locationId)}, {$set: {statusUpdateList}});
  return true;
};

export const clearLocationStatusesByAdmin = async (locationId, adminUserId) => {
  locationId = await validateIdField(locationId);
  const adminIdStr = normalizeUserIdString(adminUserId);
  await validateIdField(adminIdStr);

  const userCollection = await userCollectionFn();
  const adminUser = await userCollection.findOne({_id: new ObjectId(adminIdStr)});
  if (!adminUser || !adminUser.isAdmin) throw new Error('Admin access required');

  const locationCollection = await location();
  await locationCollection.updateOne({_id: new ObjectId(locationId)}, {$set: {statusUpdateList: []}});
  return true;
};

export const createOrJoinLocationTimeSlots = async (locationId, userId, startDateTime, endDateTime) => {
  locationId = await validateIdField(locationId);
  const userIdStr = normalizeUserIdString(userId);
  await validateIdField(userIdStr);
  const start = parseDateField(startDateTime, 'Start time');
  const end = parseDateField(endDateTime, 'End time');
  if (end <= start) throw new Error('End time must be after start time');

  const diffMs = end.getTime() - start.getTime();
  const slotMs = 15 * 60 * 1000;
  if (diffMs % slotMs !== 0) throw new Error('Time slot range must use 15 minute increments');

  const locationCollection = await location();
  const loc = await getLocationById(locationId);
  const timeSlotList = emptyIfMissing(loc.timeSlotList).slice();

  for (let current = start.getTime(); current < end.getTime(); current += slotMs) {
    const next = current + slotMs;
    let matchedSlot = null;
    for (let i = 0; i < timeSlotList.length; i++) {
      const timeSlot = timeSlotList[i];
      const slotStart = new Date(timeSlot.startDateTime).getTime();
      const slotEnd = new Date(timeSlot.endDateTime).getTime();
      if (slotStart === current && slotEnd === next) {
        matchedSlot = timeSlot;
        break;
      }
    }

    if (!matchedSlot) {
      matchedSlot = {
        _id: new ObjectId(),
        dateTimeCreated: new Date(),
        createdByUserId: new ObjectId(userIdStr),
        startDateTime: new Date(current),
        endDateTime: new Date(next),
        joinedUserIdList: []
      };
      timeSlotList.push(matchedSlot);
    }

    let joinedUserIdList = emptyIfMissing(matchedSlot.joinedUserIdList).map((id) => id.toString());
    if (joinedUserIdList.indexOf(userIdStr) === -1) joinedUserIdList.push(userIdStr);
    matchedSlot.joinedUserIdList = joinedUserIdList.map((id) => new ObjectId(id));
  }

  await locationCollection.updateOne({_id: new ObjectId(locationId)}, {$set: {timeSlotList}});
  return true;
};

export const toggleJoinLocationTimeSlot = async (locationId, timeSlotId, userId) => {
  locationId = await validateIdField(locationId);
  timeSlotId = await validateIdField(timeSlotId);
  const userIdStr = normalizeUserIdString(userId);
  await validateIdField(userIdStr);

  const locationCollection = await location();
  const loc = await getLocationById(locationId);
  const timeSlotList = emptyIfMissing(loc.timeSlotList).slice();
  let found = false;

  for (let i = 0; i < timeSlotList.length; i++) {
    const timeSlot = timeSlotList[i];
    if (timeSlot._id && timeSlot._id.toString() === timeSlotId) {
      found = true;
      let joinedUserIdList = emptyIfMissing(timeSlot.joinedUserIdList).map((id) => id.toString());
      if (joinedUserIdList.indexOf(userIdStr) !== -1) joinedUserIdList = joinedUserIdList.filter((id) => id !== userIdStr);
      else joinedUserIdList.push(userIdStr);
      timeSlot.joinedUserIdList = joinedUserIdList.map((id) => new ObjectId(id));
    }
  }

  if (!found) throw new Error('Time slot not found');
  await locationCollection.updateOne({_id: new ObjectId(locationId)}, {$set: {timeSlotList}});
  return true;
};

export const createLocation = async (locationInput) => {
  const locationCollection = await location();
  const doc = buildLocationInput(locationInput);
  const result = await locationCollection.insertOne(doc);
  if (!result || !result.insertedId) throw new Error('Error creating location');
  return getLocationById(result.insertedId.toString());
};

export const updateLocationById = async (locationId, locationInput) => {
  locationId = await validateIdField(locationId);
  const existingLocation = await getLocationById(locationId);
  const updateDoc = buildLocationInput(locationInput, existingLocation);
  const locationCollection = await location();
  await locationCollection.updateOne({_id: new ObjectId(locationId)}, {$set: updateDoc});
  return getLocationById(locationId);
};

export const deleteLocationById = async (locationId) => {
  locationId = await validateIdField(locationId);
  const locationCollection = await location();
  const result = await locationCollection.deleteOne({_id: new ObjectId(locationId)});
  if (!result || result.deletedCount !== 1) throw new Error('Could not delete location');
  return true;
};

export const createLocationFromRequest = async (locationRequest) => {
  const locationCollection = await location();
  const locationObj = {
    dateTimeCreated: new Date(),
    locationType: locationRequest.locationType,
    commentList: [],
    statusUpdateList: [],
    ratingList: [],
    timeSlotList: [],
    locationName: locationRequest.locationName,
    description: locationRequest.description,
    address: locationRequest.address,
    latitude: locationRequest.latitude,
    longitude: locationRequest.longitude,
    accessible: locationRequest.accessible,
    numCourts: locationRequest.numCourts,
    indoorOutdoor: locationRequest.indoorOutdoor,
    tennisType: locationRequest.tennisType,
    length: locationRequest.length,
    difficulty: locationRequest.difficulty,
    otherDetails: locationRequest.otherDetails,
    limitedAccess: locationRequest.limitedAccess
  };

  const result = await locationCollection.insertOne(locationObj);
  if (!result) throw new Error('Error creating location from request');
  return true;
};
