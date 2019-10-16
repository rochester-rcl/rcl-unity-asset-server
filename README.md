# Unity Asset Server
*A simple NodeJS server application to store and retrieve Unity Asset Bundles*

### Requirements
NodeJS >= v11.*
TypeScript >= v3.5.1 (if building from source)

### Installation

#### Using a pre-built release 
Install the latest [release](https://github.com/rochester-rcl/rcl-unity-asset-server/releases) and unzip it.

#### Building from source

First, make sure the [Typescript](https://github.com/Microsoft/TypeScript) compiler is globally installed:

`npm install -g typescript`

Next, clone the repository and run: 
`npm install`

**NOTE**: When building from source a server-config.ts file must be present in the root directory of the project. Use *server-config.ts* as an example.

Next, build the project:
`npm run build`

### Configuration
#### Server Configuration
The following options can be set in a file called *server-config.js*:

| Option     | Description                                                                    |
|------------|--------------------------------------------------------------------------------|
| port       | The port to run the application on.                                            |
| basename   | The URL basename the application will be accessible from.                      |
| mongoUrl   | The URL to the MongoDB database the application will use.                      |
| privateKey | The private key used to configure the Express session used by the application. |

Copy server-config-example.js to server-config.js and change the appropriate settings.

#### Authentication Configuration
The application can be configured with stateless authentication for all POST, PUT, and DELETE requests.

To generate a JSON Web Token and private and public RSA keys, use the accompanying command-line utility: 

`node utils/cli/generate-jwt.js -k [path to key].pem -e [email address (or any string for payload)] -o [path to jwt].txt`

**NOTE:** If the file at [path to key].pem exists, the utility will sign the JWT with that key. If the file does not exist, it will create a new RSA key pair at the path supplied with the -k argument.

For example:

`node utils/cli/generate-jwt.js -k mykey.pem -e jromphf@library.rochester.edu -o test-token.txt`

This will result in 3 output files: 

mykey.pem (the private key)

mykey-public.pem (the public key)

test-token.txt (the JWT)

Next, add the absolute paths to the private and public keys in a .env file at the root of the build folder:

(.env file contents)
```
PRIVATE_KEY_PATH = [path-to-private-key].pem
PUBLIC_KEY_PATH = [path-to-public-key].pem
```

The resulting JWT text file can then be imported into a Unity project's Assets folder and used with the [Unity Remote Asset Tools](https://github.com/rochester-rcl/rcl-unity-remote-asset-tools.git) addon.

#### Firebase Configuration
The application can optionally be set up to support Firebase Cloud Messaging to send push notifications when asset bundles are saved or verified.

To start, set up a [Firebase project](firebase.google.com) and follow the [instructions](https://firebase.google.com/docs/admin/setup) for generating a private key for your project.

From there, add the environment variable GOOGLE_APPLICATION_CREDENTIALS to the .env file in the project root (one will need to be created if it doesn't exist).

(.env file contents)
```
PRIVATE_KEY_PATH = [path-to-private-key].pem
PUBLIC_KEY_PATH = [path-to-public-key].pem
GOOGLE_APPLICATION_CREDENTIALS = [path-to-credentials].json
```

### Running the application
To run the application, call:

`node runserver.js`