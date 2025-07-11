"""
Security utilities for LAN Sync

This module provides security-related functionality including SSL certificate
management and token-based authentication.
"""
import os
import ssl
import logging
import tempfile
from pathlib import Path
from typing import Optional, Tuple, Dict, Any
from datetime import datetime, timedelta
import jwt
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives.serialization import (
    Encoding, PrivateFormat, NoEncryption, BestAvailableEncryption
)

logger = logging.getLogger(__name__)

class SecurityManager:
    """Manages security-related operations for LAN Sync."""
    
    def __init__(self, config_dir: Optional[Path] = None):
        """Initialize the security manager.
        
        Args:
            config_dir: Directory to store security-related files (certs, keys, etc.)
        """
        self.config_dir = config_dir or Path(tempfile.gettempdir()) / 'trosyn_ssl'
        self.config_dir.mkdir(parents=True, exist_ok=True)
        
        # Paths to key files
        self.key_path = self.config_dir / 'private_key.pem'
        self.cert_path = self.config_dir / 'certificate.pem'
        self.ca_cert_path = self.config_dir / 'ca_certificate.pem'
        
        # Generate or load keys and certificates
        self._ensure_keys_and_certs()
        
        # JWT settings
        self.jwt_secret = os.urandom(32).hex()
        self.jwt_algorithm = 'HS256'
        self.access_token_expire_minutes = 60  # 1 hour
    
    def _ensure_keys_and_certs(self) -> None:
        """Ensure that SSL keys and certificates exist, generate them if not."""
        if not self.key_path.exists() or not self.cert_path.exists():
            logger.info("Generating new SSL key and certificate...")
            self._generate_self_signed_cert()
    
    def _generate_self_signed_cert(self) -> None:
        """Generate a self-signed SSL certificate for testing."""
        # Generate private key
        key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )
        
        # Generate self-signed certificate
        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.COUNTRY_NAME, "US"),
            x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "California"),
            x509.NameAttribute(NameOID.LOCALITY_NAME, "San Francisco"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Trosyn AI"),
            x509.NameAttribute(NameOID.COMMON_NAME, "trosyn.local"),
        ])
        
        cert = (
            x509.CertificateBuilder()
            .subject_name(subject)
            .issuer_name(issuer)
            .public_key(key.public_key())
            .serial_number(x509.random_serial_number())
            .not_valid_before(datetime.utcnow())
            .not_valid_after(datetime.utcnow() + timedelta(days=365))
            .add_extension(
                x509.SubjectAlternativeName([x509.DNSName("localhost")]),
                critical=False,
            )
            .sign(key, hashes.SHA256())
        )
        
        # Save private key
        with open(self.key_path, 'wb') as f:
            f.write(key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.TraditionalOpenSSL,
                encryption_algorithm=serialization.NoEncryption(),
            ))
        
        # Save certificate
        with open(self.cert_path, 'wb') as f:
            f.write(cert.public_bytes(serialization.Encoding.PEM))
        
        # For testing, use the same cert as CA cert
        with open(self.ca_cert_path, 'wb') as f:
            f.write(cert.public_bytes(serialization.Encoding.PEM))
        
        logger.info(f"Generated new SSL certificate: {self.cert_path}")
    
    def get_ssl_context(self, server_side: bool = False, verify_cert: Optional[bool] = None) -> ssl.SSLContext:
        """Get an SSL context for secure communication.
        
        Args:
            server_side: Whether this is a server-side context
            verify_cert: Whether to verify SSL certificates. If None, uses TRUOSYNC_VERIFY_SSL env var or False.
            
        Returns:
            Configured SSLContext
            
        Note:
            In production, always set verify_cert=True and provide proper CA certificates.
        """
        # Create a new SSL context with modern security settings
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER if server_side else ssl.PROTOCOL_TLS_CLIENT)
        
        # Configure certificate verification based on parameter or environment
        if verify_cert is None:
            verify_cert = os.getenv('TROSYNC_VERIFY_SSL', '').lower() not in ('0', 'false', 'no', 'off')
            
        if verify_cert:
            # Enable certificate verification
            context.verify_mode = ssl.CERT_REQUIRED
            context.check_hostname = not server_side  # Only check hostname for clients
            
            # Load system CA certificates
            context.load_default_certs()
            
            # For server-side, load our certificate chain
            if server_side:
                if not self.cert_path.exists() or not self.key_path.exists():
                    logger.warning("Certificate or key not found, generating new ones")
                    self._ensure_keys_and_certs()
                context.load_cert_chain(
                    certfile=str(self.cert_path),
                    keyfile=str(self.key_path)
                )
            logger.debug("SSL certificate verification is enabled")
        else:
            # For development/testing only
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
            logger.warning("SSL certificate verification is disabled. This is not secure for production use.")
        
        # Log the SSL configuration
        logger.debug(f"Created SSL context: server_side={server_side}, "
                   f"check_hostname={context.check_hostname}, "
                   f"verify_mode={context.verify_mode}")
        
        # Load certificate and key for server
        if server_side:
            try:
                context.load_cert_chain(
                    certfile=str(self.cert_path),
                    keyfile=str(self.key_path)
                )
                logger.debug(f"Loaded server certificate from {self.cert_path}")
            except Exception as e:
                logger.error(f"Failed to load server certificate: {e}", exc_info=True)
                raise
        else:
            # For client, we're not verifying the server in test mode
            logger.debug("Client SSL context configured with no verification")
        
        return context
    
    def create_access_token(self, data: Dict[str, Any]) -> str:
        """Create a JWT access token.
        
        Args:
            data: Data to include in the token
            
        Returns:
            Encoded JWT token
        """
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, self.jwt_secret, algorithm=self.jwt_algorithm)
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify a JWT token.
        
        Args:
            token: JWT token to verify
            
        Returns:
            Decoded token data if valid, None otherwise
        """
        try:
            return jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
        except jwt.PyJWTError:
            return None

# Global instance for easy access
security = SecurityManager()
