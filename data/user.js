import {user} from '../config/mongoCollections.js';
import {validateUserPara} from '../helpers.js'
import {ObjectId} from 'mongodb';
// import valid from 'validator';


// Register user and then return registered user object
export const registerUser = async (
  username, hashedPassword
) => {
  await validateUserPara(username, hashedPassword); // Will error out if parameters are incorrect

  const insertResponse = user.insertOne({username: username, password: hashedPassword, isAdmin: false});
  const insertedUser = user.findOne({_id: insertResponse._id});
  return insertedUser; // return user in question
};