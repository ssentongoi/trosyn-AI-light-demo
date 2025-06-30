# Frontend Testing Strategy

## Rationale for Switching from Cypress to Jest/React Testing Library

We initially planned to use Cypress for end-to-end (E2E) testing of the authentication flows. However, we encountered persistent dependency issues with Cypress on macOS, particularly related to system-level dependencies and compatibility issues with the current environment.

### Issues with Cypress
1. **Dependency Problems**: Cypress requires specific system dependencies that were not easily resolvable in the current environment.
2. **Environment-Specific Issues**: The errors were specific to the macOS environment and would require significant effort to resolve.
3. **Development Speed**: The time spent troubleshooting Cypress was delaying progress on testing critical authentication flows.

### Benefits of Jest/React Testing Library
1. **Reliability**: Jest and React Testing Library are more stable and have fewer environment-specific issues.
2. **Faster Feedback**: Unit and integration tests run faster than E2E tests, allowing for quicker iterations.
3. **Better Suited for Component Testing**: React Testing Library is specifically designed for testing React components in a way that encourages good testing practices.
4. **Easier Mocking**: Jest's mocking capabilities make it easier to test components in isolation.

## Testing Strategy

### Unit Testing with Jest
- Test individual components in isolation.
- Mock external dependencies and APIs.
- Focus on testing component behavior rather than implementation details.

### Integration Testing with React Testing Library
- Test component interactions.
- Simulate user interactions (clicks, form submissions, etc.).
- Verify that components work together as expected.

### Test Coverage
- Aim for high test coverage of critical paths, especially authentication and core functionality.
- Focus on testing user interactions and business logic rather than implementation details.

## Next Steps

1. **Fix Test Environment Configuration**: Resolve the current issues with the test environment setup.
2. **Write Tests for Authentication Flows**:
   - Login component tests (in progress)
   - Registration component tests
   - Password reset flow tests
3. **Test Protected Routes**: Ensure that protected routes redirect unauthenticated users.
4. **Test Error Handling**: Verify that error states are handled gracefully.
5. **Continuous Integration**: Set up CI to run tests on every push.

## Running Tests

To run the tests, use the following command:

```bash
cd src/frontend
npm test
```

Or use the provided script:

```bash
./run_tests.sh
```

## Writing New Tests

When writing new tests, follow these guidelines:

1. **Test Behavior, Not Implementation**: Focus on what the user sees and does, not how the component is implemented.
2. **Use Descriptive Test Names**: Test names should describe what the test is verifying.
3. **Keep Tests Isolated**: Each test should be independent of others.
4. **Mock External Dependencies**: Use Jest's mocking capabilities to isolate the component being tested.

## Debugging Tests

To debug tests, you can use the following techniques:

1. **Debug Logs**: Use `console.log` to log values during test execution.
2. **Debug Mode**: Run tests in debug mode with `npm test -- --debug`.
3. **Interactive Mode**: Use `npm test -- --watch` to run tests in watch mode.

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library Documentation](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Library Cheatsheet](https://testing-library.com/docs/react-testing-library/cheatsheet)
