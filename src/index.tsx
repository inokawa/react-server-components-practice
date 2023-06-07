import { IncomingMessage, ServerResponse, createServer } from "http";
import { readFile, readdir } from "fs/promises";
import { ReactNode } from "react";
import { renderJSXToHTML } from "./jsx";
import sanitizeFilename from "sanitize-filename";

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

function BlogPostPage({
  postSlug,
  postContent,
}: {
  postSlug: string;
  postContent: string;
}) {
  return (
    <section>
      <h2>
        <a href={"/" + postSlug}>{postSlug}</a>
      </h2>
      <article>{postContent}</article>
    </section>
  );
}

function BlogIndexPage({
  postSlugs,
  postContents,
}: {
  postSlugs: string[];
  postContents: string[];
}) {
  return (
    <section>
      <h1>Welcome to my blog</h1>
      <div>
        {postSlugs.map((postSlug, index) => (
          <section key={postSlug}>
            <h2>
              <a href={"/" + postSlug}>{postSlug}</a>
            </h2>
            <article>{postContents[index]}</article>
          </section>
        ))}
      </div>
    </section>
  );
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    // Match the URL to a page and load the data it needs.
    const page = await matchRoute(url);
    // Wrap the matched page into the shared layout.
    sendHTML(res, <BlogLayout>{page}</BlogLayout>);
  } catch (err) {
    console.error(err);
    res.statusCode = (err as any).statusCode ?? 500;
    res.end();
  }
}).listen(8080);

async function matchRoute(url: URL): Promise<ReactNode> {
  if (url.pathname === "/") {
    // We're on the index route which shows every blog post one by one.
    // Read all the files in the posts folder, and load their contents.
    const postFiles = await readdir("./posts");
    const postSlugs = postFiles.map((file) =>
      file.slice(0, file.lastIndexOf("."))
    );
    const postContents = await Promise.all(
      postSlugs.map((postSlug) =>
        readFile("./posts/" + postSlug + ".txt", "utf8")
      )
    );
    return <BlogIndexPage postSlugs={postSlugs} postContents={postContents} />;
  } else {
    // We're showing an individual blog post.
    // Read the corresponding file from the posts folder.
    const postSlug = sanitizeFilename(url.pathname.slice(1));
    try {
      const postContent = await readFile(
        "./posts/" + postSlug + ".txt",
        "utf8"
      );
      return <BlogPostPage postSlug={postSlug} postContent={postContent} />;
    } catch (err) {
      throwNotFound(err as any);
    }
  }
}

function throwNotFound(cause: Error): never {
  const notFound = new Error("Not found.", { cause });
  (notFound as any).statusCode = 404;
  throw notFound;
}

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
