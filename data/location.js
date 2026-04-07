import {location} from '../config/mongoCollections.js';
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

export const getAllLocationsForDisplay = async (locationTypeFilter, q) => {
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

  const out = [];
  for (let i = 0; i < locations.length; i++) {
    const loc = locations[i];

    let dateTimeISO = '';
    let dateTimeLabel = '';
    if (loc.dateTimeCreated instanceof Date) {
      dateTimeISO = loc.dateTimeCreated.toISOString();
      dateTimeLabel = loc.dateTimeCreated.toLocaleString();
    } else {
      dateTimeLabel = String(loc.dateTimeCreated);
    }

    out.push({
      _idStr: loc._id.toString(),
      dateTimeCreated: loc.dateTimeCreated,
      dateTimeISO,
      dateTimeLabel,
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
      timeSlotCount: emptyIfMissing(loc.timeSlotList).length
    });
  }
  return out;
};

export const getAllLocationsForMap = async (locationTypeFilter, q) => {
  const locations = await getAllLocationsForDisplay(locationTypeFilter, q);
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
      difficulty: loc.difficulty
    });
  }
  return out;
};

export const createLocation = async (name) => {
  if (typeof name !== 'string' || !name.trim()) throw new Error('Location name is required');
  return null;
};
