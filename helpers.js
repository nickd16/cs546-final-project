import validator from 'validator';
import bcrypt from 'bcryptjs';
import {user} from './config/mongoCollections.js'
import { ObjectId } from 'mongodb';

export const checkDupUsername = async (username) => {
    username = await validateUsernameField(username);

    const userCollection = await user();
    // Check for duplicate usernames
    const userWithUsername = await userCollection.findOne({username: username});
    if (userWithUsername != null) {
        throw Error("There exists a user with that username!");
    }
    return true;
};

export const usernameExists = async (username) => {
    username = await validateUsernameField(username);

    const userCollection = await user();
    // Check for duplicate usernames
    const userWithUsername = await userCollection.findOne({username: username});
    if (userWithUsername == null) {
        // throw Error("There doesn't exist a user with that username!");
        return false;
    }
    return true;
};

export const passwordMatchesHash = async (username, password) => {
    username = await validateUsernameField(username);

    password = await validatePasswordField(password);

    const userCollection = await user();
    const user1 = await userCollection.findOne({ username: username });
    const isMatch = await bcrypt.compare(password, user1.hashedPassword);
    return isMatch;
};

export const validateUsernameField = async (username) => { // We can keep these validaters up to date so across anywhere we used the field we will check
    if (typeof username == 'undefined') {
        throw Error("Username is undefined!");
    }
    if (typeof username != 'string') {
        throw Error("Username is not string!");
    }
    const trimmedUsername = username.trim();
    if (!validator.isAlphanumeric(trimmedUsername)) {
        throw Error("Username is not alphanumerical!");
    }
    if (!(trimmedUsername.length <= 32)) { // Usernames must be less or equal to 32 characters
        throw Error("Username is greater then 32 characters!");
    }
    return trimmedUsername.toLowerCase();
};

export const validatePasswordField = async (password) => {
    if (typeof password == 'undefined') {
        throw Error("Password is undefined!");
    }
    if (typeof password != 'string') {
        throw Error("Password is not string!");
    }
    const trimmedPassword = password.trim();
    if (trimmedPassword.length < 6) { // Less then 6 characters
        throw Error("Password is less then 6 characters!");
    }

    let passwordLowerCaseCount = 0;
    let passwordUpperCaseCount = 0;
    let passwordDigitCount = 0;
    let passwordSpecialCharCount = 0;

    for (let characterIndex = 0; characterIndex < trimmedPassword.length; characterIndex++) {
        const currCharC = trimmedPassword[characterIndex];
        const currChar = trimmedPassword[characterIndex].charCodeAt(0);
        if (('a'.charCodeAt(0) <= currChar && 'z'.charCodeAt(0) >= currChar)) { // Lowercase
            passwordLowerCaseCount += 1;
        } else if (('A'.charCodeAt(0) <= currChar && 'Z'.charCodeAt(0) >= currChar)) { // Uppercase
            passwordUpperCaseCount += 1;
        } else if (('0'.charCodeAt(0) <= currChar && '9'.charCodeAt(0) >= currChar)) { // Numbers
            passwordDigitCount += 1;
        } else { // Special Characters
            passwordSpecialCharCount += 1;
        }
    }

    if (!passwordLowerCaseCount >= 1) {
        throw Error("Password has no lower case characters!");
    }
    if (!passwordUpperCaseCount >= 1) {
        throw Error("Password has no upper case characters!");
    }
    if (!passwordDigitCount >= 1) {
        throw Error("Password has no digits!");
    }
    if (!passwordSpecialCharCount >= 1) {
        throw Error("Password has no special characters!");
    }

    return trimmedPassword;
};

export const validateHashedPasswordField = async (hashedPassword) => {
    if (typeof hashedPassword == 'undefined') {
        throw Error("hashedPassword is undefined!");
    }
    if (typeof hashedPassword != 'string') {
        throw Error("hashedPassword is not string!");
    }
    return hashedPassword;
};

export const validateIsAdminField = async (isAdmin) => {
    if (typeof isAdmin == 'undefined') {
        throw Error("isAdmin is undefined!");
    }
    if (typeof isAdmin != 'boolean') {
        throw Error("isAdmin is not boolean!");
    }
    return isAdmin;
};

export const validateFavLocationIdsField = async (favLocationIds) => {
    if (typeof favLocationIds == 'undefined') {
        throw Error("favLocationIds is undefined!");
    }
    if (typeof favLocationIds != 'object') {
        throw Error("favLocationIds is not object!");
    }
    for (let locationId of favLocationIds) { // Validate all ids in favLocationIdsField
        locationId = await validateIdField(locationId);
    }
    return favLocationIds;
};

export const validateIdField = async (id) => { // We can keep these validators up to date so across anywhere we used the field we will check
    if (typeof id == 'undefined') {
        throw Error("id is undefined!");
    }
    if (typeof id != 'string') {
        throw Error("id is not string!");
    }
    id = id.trim();
    if (id.length === 0)
        throw 'id cannot be an empty string or just spaces!';
    if (!ObjectId.isValid(id)) throw 'invalid object ID!';
    return id;
};


