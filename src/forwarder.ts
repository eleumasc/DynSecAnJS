import * as http from "http";
import * as net from "net";
import * as zlib from "zlib";

// Create a basic HTTP server
const server = http.createServer();

// Handle HTTP CONNECT method
server.on("connect", (_, clientSocket, head) => {
  const hostname = "127.0.0.1";
  const port = 8443;

  // Create a connection to the target server
  const serverSocket = net.connect(Number(port), hostname, () => {
    // Respond to the client that the connection has been established
    clientSocket.write(
      "HTTP/1.1 200 Connection Established\r\n" +
        "Proxy-agent: Node.js-Proxy\r\n" +
        "\r\n"
    );

    // Pipe data between client and server sockets
    serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  // Handle errors on the server socket
  serverSocket.on("error", (err) => {
    console.error(`Server socket error: ${err.message}`);
    clientSocket.end(`HTTP/1.1 500 ${err.message}\r\n`);
  });

  // Handle errors on the client socket
  clientSocket.on("error", (err) => {
    console.error(`Client socket error: ${err.message}`);
    serverSocket.end();
  });
});

// Start the server on port 8000
server.listen(8000, () => {
  console.log("Proxy server listening on port 8000");
});
