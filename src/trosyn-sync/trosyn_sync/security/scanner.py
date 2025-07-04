"""Security scanner for identifying potential vulnerabilities in the codebase."""
import ast
import inspect
import re
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple, Type, Any
import logging

from ..config import settings

logger = logging.getLogger(__name__)

class SecurityIssue:
    """Represents a potential security issue found during scanning."""
    
    def __init__(
        self,
        issue_type: str,
        description: str,
        file_path: Optional[Path] = None,
        line_number: Optional[int] = None,
        code_snippet: Optional[str] = None,
        severity: str = "medium",
        remediation: Optional[str] = None,
    ):
        self.issue_type = issue_type
        self.description = description
        self.file_path = file_path
        self.line_number = line_number
        self.code_snippet = code_snippet
        self.severity = severity.lower()
        self.remediation = remediation or "No specific remediation provided."
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the issue to a dictionary for reporting."""
        return {
            "issue_type": self.issue_type,
            "description": self.description,
            "file": str(self.file_path) if self.file_path else None,
            "line": self.line_number,
            "code_snippet": self.code_snippet,
            "severity": self.severity,
            "remediation": self.remediation,
        }
    
    def __str__(self) -> str:
        location = f"{self.file_path}:{self.line_number}" if self.file_path and self.line_number else "<unknown>"
        return f"[{self.severity.upper()}] {self.issue_type} at {location}\n  {self.description}\n  Remediation: {self.remediation}"

class SecurityScanner:
    ""
    Scans Python source code for potential security vulnerabilities.
    
    This scanner looks for common security issues such as:
    - Hardcoded secrets
    - SQL injection vectors
    - Command injection
    - Insecure deserialization
    - Insecure HTTP requests
    """
    
    # Patterns for detecting potential secrets
    SECRET_PATTERNS = {
        "password": r'(password|passwd|pwd|secret|token|key|apikey|api_key|access_key|private_key|secret_key|auth|credential)[\s=:]+["\']?([^\s\'\"]+)["\']?',
        "jwt": r'eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*',
        "aws_key": r'(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}',
        "api_key": r'(?i)(?:api[_-]?key|apikey|api_key)[\s=:]+["\']?([a-z0-9]{20,})["\']?',
    }
    
    # Dangerous functions and their security implications
    DANGEROUS_FUNCTIONS = {
        "eval": "Use of eval() can lead to code injection vulnerabilities",
        "exec": "Use of exec() can lead to code injection vulnerabilities",
        "pickle.loads": "Insecure deserialization can lead to code execution",
        "pickle.load": "Insecure deserialization can lead to code execution",
        "marshal.loads": "Insecure deserialization can lead to code execution",
        "marshal.load": "Insecure deserialization can lead to code execution",
        "yaml.load": "Use yaml.safe_load() instead to prevent code execution",
        "subprocess.Popen": "Potential shell injection if shell=True or untrusted input is used",
        "os.system": "Potential shell injection vulnerability",
        "os.popen": "Potential shell injection vulnerability",
    }
    
    # SQL injection patterns
    SQL_PATTERNS = {
        "string_formatting": r'\b(?:f""?SELECT|f""?UPDATE|f""?INSERT|f""?DELETE).*?%s.*?"',
        "percent_formatting": r'\b(?:SELECT|UPDATE|INSERT|DELETE).*?%\s*\(',
        "format_method": r'\b(?:SELECT|UPDATE|INSERT|DELETE).*?\{\s*\w+\s*\}',
    }
    
    def __init__(self, root_dir: Optional[Path] = None):
        """Initialize the security scanner."""
        self.root_dir = root_dir or Path.cwd()
        self.issues: List[SecurityIssue] = []
        self.ignored_paths = {
            '**/__pycache__/**',
            '**/.git/**',
            '**/venv/**',
            '**/env/**',
            '**/node_modules/**',
            '**/.mypy_cache/**',
            '**/.pytest_cache/**',
        }
    
    def scan(self) -> List[SecurityIssue]:
        """Scan the codebase for security issues."""
        logger.info(f"Starting security scan in {self.root_dir}")
        
        # Scan all Python files
        for py_file in self.root_dir.rglob("*.py"):
            if self._should_skip(py_file):
                continue
                
            try:
                self._scan_file(py_file)
            except Exception as e:
                logger.warning(f"Error scanning {py_file}: {str(e)}")
        
        logger.info(f"Security scan complete. Found {len(self.issues)} potential issues.")
        return self.issues
    
    def _should_skip(self, file_path: Path) -> bool:
        """Determine if a file should be skipped during scanning."""
        # Skip files in ignored directories
        for pattern in self.ignored_paths:
            if file_path.match(pattern):
                return True
        return False
    
    def _scan_file(self, file_path: Path) -> None:
        """Scan a single Python file for security issues."""
        logger.debug(f"Scanning {file_path}")
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Check for secrets in the file
            self._check_for_secrets(content, file_path)
            
            # Parse the file to an AST for more sophisticated checks
            try:
                tree = ast.parse(content)
                self._check_ast(tree, file_path, content)
            except SyntaxError as e:
                logger.warning(f"Syntax error in {file_path}: {str(e)}")
                
        except UnicodeDecodeError:
            logger.warning(f"Could not read {file_path} as UTF-8")
    
    def _check_for_secrets(self, content: str, file_path: Path) -> None:
        """Check for potential secrets in the file content."""
        for line_num, line in enumerate(content.split('\n'), 1):
            # Skip comments and docstrings
            if line.strip().startswith('#') or line.strip().startswith('"""'):
                continue
                
            # Check for potential secrets
            for secret_type, pattern in self.SECRET_PATTERNS.items():
                if re.search(pattern, line, re.IGNORECASE):
                    self.issues.append(SecurityIssue(
                        issue_type=f"Potential {secret_type} exposure",
                        description=f"Potential {secret_type} found in code",
                        file_path=file_path,
                        line_number=line_num,
                        code_snippet=line.strip(),
                        severity="high",
                        remediation=f"Remove hardcoded {secret_type} and use environment variables or a secure secret manager.",
                    ))
    
    def _check_ast(self, tree: ast.AST, file_path: Path, content: str) -> None:
        """Analyze the AST for security issues."""
        for node in ast.walk(tree):
            # Check for dangerous function calls
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
                func_name = node.func.id
                if func_name in self.DANGEROUS_FUNCTIONS:
                    self._add_issue(
                        issue_type=f"Dangerous function call: {func_name}",
                        description=self.DANGEROUS_FUNCTIONS[func_name],
                        node=node,
                        file_path=file_path,
                        content=content,
                        severity="high",
                    )
            
            # Check for SQL injection patterns
            if isinstance(node, ast.Str):
                self._check_sql_injection(node, file_path, content)
    
    def _check_sql_injection(self, node: ast.Str, file_path: Path, content: str) -> None:
        """Check for potential SQL injection in string literals."""
        for pattern_name, pattern in self.SQL_PATTERNS.items():
            if re.search(pattern, node.s, re.IGNORECASE):
                self._add_issue(
                    issue_type="Potential SQL injection",
                    description=f"Potential SQL injection using {pattern_name} pattern",
                    node=node,
                    file_path=file_path,
                    content=content,
                    severity="high",
                    remediation="Use parameterized queries or an ORM to prevent SQL injection.",
                )
    
    def _add_issue(
        self,
        issue_type: str,
        description: str,
        node: ast.AST,
        file_path: Path,
        content: str,
        severity: str = "medium",
        remediation: Optional[str] = None,
    ) -> None:
        """Add a security issue to the results."""
        # Get line number from the node
        line_number = getattr(node, 'lineno', None)
        
        # Get the line of code where the issue was found
        code_snippet = None
        if line_number:
            lines = content.split('\n')
            if 0 <= line_number - 1 < len(lines):
                code_snippet = lines[line_number - 1].strip()
        
        self.issues.append(SecurityIssue(
            issue_type=issue_type,
            description=description,
            file_path=file_path,
            line_number=line_number,
            code_snippet=code_snippet,
            severity=severity,
            remediation=remediation,
        ))

def run_security_scan(root_dir: Optional[Path] = None) -> List[Dict[str, Any]]:
    ""
    Run a security scan on the codebase and return the results.
    
    Args:
        root_dir: The root directory to scan (defaults to current working directory)
        
    Returns:
        A list of security issues found during the scan
    """
    scanner = SecurityScanner(root_dir)
    issues = scanner.scan()
    
    # Convert issues to dictionaries for JSON serialization
    return [issue.to_dict() for issue in issues]

def print_security_report(issues: List[Dict[str, Any]]) -> None:
    """Print a formatted security report."""
    if not issues:
        print("✅ No security issues found!")
        return
    
    # Group issues by severity
    by_severity: Dict[str, List[Dict[str, Any]]] = {
        "critical": [],
        "high": [],
        "medium": [],
        "low": [],
    }
    
    for issue in issues:
        severity = issue.get("severity", "medium").lower()
        if severity not in by_severity:
            severity = "medium"  # Default to medium if invalid
        by_severity[severity].append(issue)
    
    # Print the report
    print("\n" + "=" * 80)
    print("SECURITY SCAN REPORT".center(80))
    print("=" * 80)
    
    for severity in ["critical", "high", "medium", "low"]:
        issues = by_severity[severity]
        if not issues:
            continue
            
        print(f"\n{severity.upper()} SEVERITY ISSUES ({len(issues)}):")
        print("-" * 80)
        
        for i, issue in enumerate(issues, 1):
            print(f"{i}. {issue['issue_type']}")
            print(f"   File: {issue.get('file', '<unknown>')}")
            if issue.get('line'):
                print(f"   Line: {issue['line']}")
            if issue.get('code_snippet'):
                print(f"   Code: {issue['code_snippet']}")
            print(f"   Description: {issue['description']}")
            print(f"   Remediation: {issue.get('remediation', 'No remediation provided.')}")
            print()
    
    print("=" * 80)
    print("SCAN COMPLETE".center(80))
    print("=" * 80)
    
    # Print a summary
    total_issues = sum(len(issues) for issues in by_severity.values())
    print(f"\nFound {total_issues} potential security issues:")
    for severity in ["critical", "high", "medium", "low"]:
        count = len(by_severity[severity])
        if count > 0:
            print(f"- {severity.upper()}: {count}")
