import program from "commander";
import { saveJWT } from "../AuthUtils";
program
  .option("-e, --email <email>", "an email address (used as JWT payload)")
  .option("-o, --output <path>", "path to save the generated token")
  .option(
    "-k, --keypath <path>",
    "path to the private key (can be absolute or relative)"
  );

program.parse(process.argv);
const { email, keypath, output } = program;
saveJWT({ email: email }, keypath, output).then(status => {
  const message = status
    ? `Successfully saved JWT to ${output}`
    : "Failed to save JWT";
  console.log(message);
});
