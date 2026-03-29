import validator from 'validator';
import bcrypt from 'bcryptjs';
import {user} from './config/mongoCollections.js'
export const checkDupUsername = async (username) => {
    await validateUsernameField(username);

    const userCollection = await user();
    // Check for duplicate usernames
    const userWithUsername = await userCollection.findOne({username: username});
    if (userWithUsername != null) {
        throw Error("There exists a user with that username!");
    }
    return true;
};

export const usernameExists = async (username) => {
    await validateUsernameField(username);

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
    await validateUsernameField(username);

    await validatePasswordField(password);

    const userCollection = await user();
    const user1 = await userCollection.findOne({ username: username });
    const isMatch = await bcrypt.compare(password, user1.hashedPassword);
    return isMatch;
};

// user parameter validation function
export const validateUserPara = async (username, password) => {
    await validateUsernameField(username);

    await validatePasswordField(password);

    // Check for duplicate usernames
    await checkDupUsername(username);


    return true;
};

export const validateLoginUser = async (username, password) => {
    await validateUsernameField(username);

    await validatePasswordField(password);
    
    const userExist = await usernameExists(username);
    if (!userExist) throw Error("Invalid credentials");

    const isMatch = await passwordMatchesHash(username, password);
    if (!isMatch) throw Error("Invalid credentials");

    return true;
};

export const validateUsernameField = async (username) => { // We can keep these validaters up to date so across anywhere we used the field we will check
    if (typeof username == 'undefined') {
        throw Error("Username is undefined!");
    }
    if (typeof username != 'string') {
        throw Error("Username is not string!");
    }
    if (!validator.isAlphanumeric(username)) {
        throw Error("Username is not alphanumerical!");
    }
    return true;
};

export const validatePasswordField = async (password) => {
    if (typeof password == 'undefined') {
        throw Error("Password is undefined!");
    }
    if (typeof password != 'string') {
        throw Error("Password is not string!");
    }
    if (password.length < 6) { // Less then 6 characters
        throw Error("Password is less then 6 characters");
    }
    return true;
};


