import {user} from '../config/mongoCollections.js';
import {validateUserPara, validateLoginUser} from '../helpers.js'
import {ObjectId} from 'mongodb';
import jwt from 'jsonwebtoken';
// import valid from 'validator';


// Register user and then return registered user object
export const registerUser = async (
  username, password
) => {
  await validateUserPara(username, password); // Will error out if parameters are incorrect

  const hashedPassword = await bcrypt.hash(password, 10);

  const userCollection = await user();
  const insertResponse = await userCollection.insertOne({"dateTimeCreated": new Date(), username: username, "hashedPassword": hashedPassword, "favLocationIds": [], isAdmin: false});
  const insertedUser = await userCollection.findOne({_id: insertResponse._id});
  return insertedUser; // return user in question
};

export const getLoginToken = async (
  username, password
) => {
  await validateLoginUser(username, password);

  const userCollection = await user();
  // find user document
  const user1 = await userCollection.findOne({ username: username });

  return jwt.sign({ id: user1._id, isAdmin: user1.isAdmin }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

export const getUsername = async (
  _id
) => {
  const userCollection = await user();
  const user = await userCollection.findOne({_id: _id});
  if (user) {

  }
}