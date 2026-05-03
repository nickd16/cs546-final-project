import {user} from '../config/mongoCollections.js';
import {validateFavLocationIdsField, validateIsAdminField, validateUsernameField, validatePasswordField, validateIdField, usernameExists, passwordMatchesHash, checkDupUsername, validateHashedPasswordField} from '../helpers.js'
import {ObjectId} from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
// import valid from 'validator';


// Register user and then return registered user object
export const registerUser = async (
  username, password
) => {
  username = await validateUsernameField(username);
  
  password = await validatePasswordField(password);

  // Check for duplicate usernames
  await checkDupUsername(username);

  const hashedPassword = await bcrypt.hash(password, 10);

  const userCollection = await user();
  const insertResponse = await userCollection.insertOne({"dateTimeCreated": new Date(), username: username, "hashedPassword": hashedPassword, "favLocationIds": [], isAdmin: false});
  const insertedUser = await getUserById(insertResponse.insertedId.toString());
  return insertedUser; // return user in question
};

export const getLoginToken = async (
  username, password
) => {
  username = await validateUsernameField(username);
  
  password = await validatePasswordField(password);
  
  const userExist = await usernameExists(username);
  if (!userExist) throw Error("Invalid credentials!");

  const isMatch = await passwordMatchesHash(username, password);
  if (!isMatch) throw Error("Invalid credentials!");

  // find user document
  const user1 = await getUserByUsername(username);

  return jwt.sign({ id: user1._id, isAdmin: user1.isAdmin }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

export const getUserById = async (
  _id
) => {
  _id = await validateIdField(_id);

  const userCollection = await user();
  const user1 = await userCollection.findOne({_id: new ObjectId(_id)});
  if (user1 == null) {
    throw Error("user not found from id!");
  }
  delete user1["hashedPassword"]; // If they need this they need to be verified!
  return user1;
}

export const getUserByUsername = async (
  username
) => {
  username = await validateUsernameField(username);

  const userCollection = await user();
  const user1 = await userCollection.findOne({"username": username});
  if (user1 == null) {
    throw Error("user not found from username!");
  }
  delete user1["hashedPassword"]; // If they need this they need to be verified! 
  return user1;
}


// Use responsibly as it can change passwords and admin user status (restrict routes posting to it directly )
export const updateUserById = async (
  _id, updateFields
) => {
  _id = await validateIdField(_id);
  const keys = Object.keys(updateFields);
  for (let key of keys) {
    if (key == "username") {
      updateFields[key] = await validateUsernameField(updateFields[key]);
      await checkDupUsername(updateFields[key]);
    } else if (key == "hashedPassword") {
      updateFields[key] = await validateHashedPasswordField(updateFields[key]);
    } else if (key == "isAdmin") {
      updateFields[key] = await validateIsAdminField(updateFields[key]);
    } else if (key == "favLocationIds") {
      updateFields[key] = await validateFavLocationIdsField(updateFields[key]);
    } else {
      throw Error("invalid key found in updateFields!");
    }
  }

  const userCollection = await user();
  const status = await userCollection.updateOne({_id: new ObjectId(_id)}, updateFields);
  if (status.matchedCount != 1) {
    throw Error("user not found from id!");
  }
  const user1 = await userCollection.findOne({_id: new ObjectId(_id)});
  // delete user1["hashedPassword"]; // If they need this they need to be verified! 
  // If we are running this successfully as an attacker we have already messed up as the hashedPassword could be changed so no point of deleting it here
  return user1;
}

export const addFavLocationToUserById = async (
  _id, favLocationId
) => {
  _id = await validateIdField(_id);
  favLocationId = await validateIdField(favLocationId);

  const userCollection = await user();

  
  const status = userCollection.updateOne({_id: new ObjectId(_id)}, {$push: {"favLocationIds": new ObjectId(favLocationId)}});
  if (status.matchedCount != 1) {
    throw Error("user not found from id!");
  }
  const user1 = await userCollection.findOne({_id: new ObjectId(_id)}); // After update
  return user1["favLocationIds"]; // just returns the list of favLocationIds
}

export const removeFavLocationToUserById = async (
  _id, favLocationId
) => {
  _id = await validateIdField(_id);
  favLocationId = await validateIdField(favLocationId);

  const userCollection = await user();

  
  const status = userCollection.updateOne({"_id": _id}, {$pull: {"favLocationIds": new ObjectId(favLocationId)}});
  if (status.matchedCount != 1) {
    throw Error("user not found from id!");
  }
  const user1 = await userCollection.findOne({_id: new ObjectId(_id)}); // After update
  return user1["favLocationIds"]; // just returns the list of favLocationIds
}

export const deleteUserById = async (
  _id
) => {
  _id = await validateIdField(_id);

  const userCollection = await user();

  const user1 = await userCollection.findOne({_id: new ObjectId(_id)}); // Before deletion
  const status = await userCollection.deleteOne({_id: new ObjectId(_id)});
  if (status.deletedCount != 1) {
    throw Error("user not found from id!");
  }
  
  // delete user1["hashedPassword"]; // If they need this they need to be verified! // User is deleted so what is the point of hiding the hash
  return user1;
}
