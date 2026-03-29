import {dbConnection} from './mongoConnection.js';

const getCollectionFn = (collection) => {
  let _col = undefined;

  return async () => {
    if (!_col) {
      const db = await dbConnection();
      _col = await db.collection(collection);
    }

    return _col;
  };
};

export const user = getCollectionFn('user');
export const location = getCollectionFn('location');
export const forum = getCollectionFn('forum');
export const report = getCollectionFn('report');
export const locationRequest = getCollectionFn('locationRequest');
