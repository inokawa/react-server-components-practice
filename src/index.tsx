import { IncomingMessage, ServerResponse, createServer } from "http";
import { readFile } from "fs/promises";
import { ReactNode } from "react";
import { renderJSXToHTML } from "./jsx";

function BlogLayout({ children }: { children: ReactNode }) {
  const author = "Jae Doe";
  return (
    <html>
      <head>
        <title>My blog</title>
      </head>
      <body>
        <nav>
          <a href="/">Home</a>
          <hr />
        </nav>
        <main>{children}</main>
        <Footer author={author} />
      </body>
    </html>
  );
}

function BlogPostPage({
  // postSlug,
  postContent,
}: {
  // postSlug: string;
  postContent: string;
}) {
  return (
    <section>
      {/* <h2>
        <a href={"/" + postSlug}>{postSlug}</a>
      </h2> */}
      <article>{postContent}</article>
    </section>
  );
}

function Footer({ author }: { author: string }) {
  return (
    <footer>
      <hr />
      <p>
        <i>
          (c) {author} {new Date().getFullYear()}
        </i>
      </p>
    </footer>
  );
}

createServer(async (_req, res) => {
  const postContent = await readFile("./posts/hello-world.txt", "utf8");
  sendHTML(
    res,
    <BlogLayout>
      <BlogPostPage postContent={postContent} />
    </BlogLayout>
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
