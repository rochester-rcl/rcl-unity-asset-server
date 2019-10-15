# RCL-UNITY-ASSET-SERVER
*A simple NodeJS server application to store and retrieve Unity Asset Bundles*

### Installation
First, make sure the [Typescript](https://github.com/Microsoft/TypeScript) compiler is globally installed:

`npm install -g typescript`

Next, clone the repository and run 
`npm install`

### Configuration
#### Server Configuration
The following options can be set in a file called *server-config.ts*:

| Option     | Description                                                                    |
|------------|--------------------------------------------------------------------------------|
| port       | The port to run the application on.                                            |
| basename   | The URL basename the application will be accessible from.                      |
| mongoUrl   | The URL to the MongoDB database the application will use.                      |
| privateKey | The private key used to configure the Express session used by the application. |

Copy server-config-example.ts to server-config.ts and change the appropriate settings.

#### Authentication Configuration
The application can be configured with stateless authentication for all POST, PUT, and DELETE requests.

To generate a JSON Web Token and private and public RSA keys, use the accompanying command-line utility: 

`node utils/cli/generate-jwt.js -k [path to key.pem] -e [email address (or any string for payload)] -o [path to jwt.txt]`

For example:
 
`node utils/cli/generate-jwt.js -e jromphf@library.rochester.edu -o test-token.txt`
