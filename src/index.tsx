import { IncomingMessage, ServerResponse, createServer } from "http";
import { readFile, readdir } from "fs/promises";
import { ReactNode } from "react";
import { renderJSXToClientJSX, renderJSXToHTML } from "./jsx";
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
          <input />
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

function BlogPostPage({ postSlug }: { postSlug: string }) {
  return <Post slug={postSlug} />;
}

async function BlogIndexPage() {
  const postFiles = await readdir("./posts");
  const postSlugs = postFiles.map((file) =>
    file.slice(0, file.lastIndexOf("."))
  );

  return (
    <section>
      <h1>Welcome to my blog</h1>
      <div>
        {postSlugs.map((slug) => (
          <Post key={slug} slug={slug} />
        ))}
      </div>
    </section>
  );
}

async function Post({ slug }: { slug: string }) {
  let content;
  try {
    content = await readFile("./posts/" + slug + ".txt", "utf8");
  } catch (err) {
    throwNotFound(err as any);
  }
  return (
    <section>
      <h2>
        <a href={"/" + slug}>{slug}</a>
      </h2>
      <article>{content}</article>
    </section>
  );
}

function Router({ url }: { url: URL }) {
  let page;
  if (url.pathname === "/") {
    page = <BlogIndexPage />;
  } else {
    const postSlug = sanitizeFilename(url.pathname.slice(1));
    page = <BlogPostPage postSlug={postSlug} />;
  }
  return <BlogLayout>{page}</BlogLayout>;
}

function throwNotFound(cause: Error): never {
  const notFound = new Error("Not found.", { cause });
  (notFound as any).statusCode = 404;
  throw notFound;
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    if (url.pathname === "/client.js") {
      await sendScript(res, "./client.js");
    } else if (url.searchParams.has("jsx")) {
      url.searchParams.delete("jsx");
      await sendJSX(res, <Router url={url} />);
    } else {
      await sendHTML(res, <Router url={url} />);
    }
  } catch (err) {
    console.error(err);
    res.statusCode = (err as any).statusCode ?? 500;
    res.end();
  }
}).listen(8080);

type Resp = ServerResponse<IncomingMessage> & {
  req: IncomingMessage;
};

async function sendScript(res: Resp, filename: string) {
  const content = await readFile(filename, "utf8");
  res.setHeader("Content-Type", "text/javascript");
  res.end(content);
}

async function sendJSX(res: Resp, jsx: ReactNode) {
  const clientJSX = await renderJSXToClientJSX(jsx);
  const clientJSXString = JSON.stringify(clientJSX, stringifyJSX);
  res.setHeader("Content-Type", "application/json");
  res.end(clientJSXString);
}

function stringifyJSX(key: string, value: any) {
  if (value === Symbol.for("react.element")) {
    return "$RE";
  } else if (typeof value === "string" && value.startsWith("$")) {
    return "$" + value;
  } else {
    return value;
  }
}

async function sendHTML(res: Resp, jsx: ReactNode) {
  let html = await renderJSXToHTML(jsx);
  const clientJSX = await renderJSXToClientJSX(jsx);
  const clientJSXString = JSON.stringify(clientJSX, stringifyJSX);
  html += `<script>window.__INITIAL_CLIENT_JSX_STRING__ = `;
  html += JSON.stringify(clientJSXString).replace(/</g, "\\u003c");
  html += `</script>`;
  html += `
    <script type="importmap">
      {
        "imports": {
          "react": "https://esm.sh/react@canary",
          "react-dom/client": "https://esm.sh/react-dom@canary/client"
        }
      }
    </script>
    <script type="module" src="/client.js"></script>
  `;
  res.setHeader("Content-Type", "text/html");
  res.end(html);
}
