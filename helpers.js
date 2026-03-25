import validator from 'validator';
import {user} from './config/mongoCollections.js'
export const checkDupUsername = async (username) => {
    if (typeof username == 'undefined') {
        new Error("Username is undefined!");
    }
    if (typeof username != 'string') {
        new Error("Username is not string!");
    }
    if (!validator.isAlphanumeric(username)) {
        new Error("Username is not alphanumerical!");
    }

    // Check for duplicate usernames
    const userWithUsername = await user.findOne({username: username});
    if (userWithUsername == null) {
        throw Error("There exists a user with that username!");
    }
    return true;
};
// user parameter validation function
export const validateUserPara = async (username, hashedPassword) => {
    if (typeof username == 'undefined') {
        new Error("Username is undefined!");
    }
    if (typeof hashedPassword == 'undefined') {
        new Error("hashedPassword is undefined!");
    }

    if (typeof username != 'string') {
        new Error("Username is not string!");
    }
    if (typeof hashedPassword != 'string') {
        new Error("hashedPassword is not string!");
    }

    if (!validator.isAlphanumeric(username)) {
        new Error("Username is not alphanumerical!");
    }

    // Check for duplicate usernames
    await checkDupUsername(username);


    return true;
};



