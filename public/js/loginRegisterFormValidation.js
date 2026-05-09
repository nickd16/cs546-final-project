const validateUsernameField = async (username) => { // We can keep these validaters up to date so across anywhere we used the field we will check
    if (typeof username == 'undefined') {
        throw Error("Username is undefined!");
    }
    if (typeof username != 'string') {
        throw Error("Username is not string!");
    }
    const trimmedUsername = username.trim();
    for (let characterIndex = 0; characterIndex < trimmedUsername.length; characterIndex++) {
        const currChar = trimmedUsername[characterIndex].charCodeAt(0);
        if (!(('a'.charCodeAt(0) <= currChar && 'z'.charCodeAt(0) >= currChar) || ('A'.charCodeAt(0) <= currChar && 'Z'.charCodeAt(0) >= currChar) || ('0'.charCodeAt(0) <= currChar && '9'.charCodeAt(0) >= currChar))) { // Lowercase
            throw Error("Username is not alphanumerical!");
        }
    }

    if (!(trimmedUsername.length <= 32)) { // Usernames must be less or equal to 32 characters
        throw Error("Username is greater then 32 characters!");
    }
    return trimmedUsername.toLowerCase();
};

const validatePasswordField = async (password) => {
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


const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');

const error = document.getElementById("error");



const signupForm = document.getElementById('registerForm');
if (signupForm) {
    signupForm.addEventListener('submit', async function(event) {
            error.textContent = "";
            const username = usernameInput.value;
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            try {
                const trimmedUsername = await validateUsernameField(username);

                // password
                const trimmedPassword = await validatePasswordField(password);
                const trimmedConfirmPassword = await validatePasswordField(confirmPassword);
        
                if (trimmedPassword != trimmedConfirmPassword) {
                    throw Error("Passwords do not match!");
                }
            } catch (err) {
                event.preventDefault();
                error.textContent = 'Error registering user: ' + err.message;
            }
    });
}


const signinForm = document.getElementById('loginForm');  //loginForm
if (signinForm) {
    signinForm.addEventListener('submit', async function(event) {
        error.textContent = "";
        const username = usernameInput.value;
        const password = passwordInput.value;
        
        

        try {
            const trimmedUsername = await validateUsernameField(username);
            const trimmedPassword = await validatePasswordField(password);
        } catch (err) {
            event.preventDefault();
            error.textContent = 'Error logging in user: ' + err.message;
        }
    });
}
