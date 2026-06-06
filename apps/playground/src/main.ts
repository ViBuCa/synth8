import { hello } from "@vibuca/core";

document.querySelector("#app")!.innerHTML = `
<h1>${hello()}</h1>
`;