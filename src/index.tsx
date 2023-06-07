import { IncomingMessage, ServerResponse, createServer } from "http";
import { readFile } from "fs/promises";
import { ReactNode } from "react";
import { renderJSXToHTML } from "./jsx";

createServer(async (_req, res) => {
  const author = "Jae Doe";
  const postContent = await readFile("./posts/hello-world.txt", "utf8");
  sendHTML(
    res,
    <html>
      <head>
        <title>My blog</title>
      </head>
      <body>
        <nav>
          <a href="/">Home</a>
          <hr />
        </nav>
        <article>{postContent}</article>
        <footer>
          <hr />
          <p>
            <i>
              (c) {author}, {new Date().getFullYear()}
            </i>
          </p>
        </footer>
      </body>
    </html>
  );
}).listen(8080);

function sendHTML(
  res: ServerResponse<IncomingMessage> & {
    req: IncomingMessage;
  },
  jsx: ReactNode
) {
  const html = renderJSXToHTML(jsx);
  res.setHeader("Content-Type", "text/html");
  res.end(html);
}
