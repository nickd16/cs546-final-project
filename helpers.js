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
export const checkDupEmail = async (email) => {
    if (typeof email == 'undefined') {
        new Error("Email is undefined!");
    }
    if (typeof email != 'string') {
        new Error("Email is not string!");
    }
    if (!validator.isEmail(email)) {
        new Error("Email is not valid email!");
    }

    // Check for duplicate emails
    const userWithEmail = await user.findOne({email: email});
    if (userWithEmail == null) {
        throw Error("There exists a user with that email!");
    }

    return true;
};
// user parameter validation function
export const validateUserPara = async (username, email, hashedPassword) => {
    if (typeof username == 'undefined') {
        new Error("Username is undefined!");
    }
    if (typeof email == 'undefined') {
        new Error("Email is undefined!");
    }
    if (typeof hashedPassword == 'undefined') {
        new Error("hashedPassword is undefined!");
    }

    if (typeof username != 'string') {
        new Error("Username is not string!");
    }
    if (typeof email != 'string') {
        new Error("Email is not string!");
    }
    if (typeof hashedPassword != 'string') {
        new Error("hashedPassword is not string!");
    }

    if (!validator.isAlphanumeric(username)) {
        new Error("Username is not alphanumerical!");
    }
    if (!validator.isEmail(email)) {
        new Error("Email is not valid email!");
    }


    // Check for duplicate emails
    await checkDupEmail(email);

    // Check for duplicate usernames
    await checkDupUsername(username);


    return true;
};



