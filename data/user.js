import {user} from '../config/mongoCollections.js';
import {ObjectId} from 'mongodb';
// import valid from 'validator';


// Register user and then return registered user object
export const registerUser = async (
  username, email, hashedPassword
) => {
  await validateUserPara(username, email, hashedPassword); // Will error out if parameters are incorrect

  const insertResponse = user.insertOne({username: username, email: email, password: hashedPassword});
  const insertedUser = user.findOne({_id: insertResponse._id});
  return insertedUser; // return user in question
};