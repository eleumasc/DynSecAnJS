#!/bin/bash

# Set the domain and IP address
DOMAIN="localhost"
IP_ADDRESS="127.0.0.1"
INTNET_IP_ADDRESS="192.168.1.1"

mkdir -p ca

# Generate a private key
openssl genpkey -algorithm RSA -out ca/key.pem

# Generate a certificate signing request (CSR)
openssl req -new -key ca/key.pem -out ca/csr.pem -subj "/CN=dynsecanjs CA"

# Create a configuration file for the certificate extensions
cat <<EOF > ca/extfile.cnf
subjectAltName = DNS:$DOMAIN, IP:$IP_ADDRESS, IP:$INTNET_IP_ADDRESS
extendedKeyUsage = serverAuth
EOF

# Generate the self-signed certificate using the CSR and extensions
openssl x509 -req -in ca/csr.pem -signkey ca/key.pem -out ca/cert.pem -extfile ca/extfile.cnf -days 365

# Clean up temporary files
rm ca/csr.pem ca/extfile.cnf

echo "Self-signed certificate generated successfully!"
