/// <reference types="cypress" />

describe('EditorJS Component', () => {
  beforeEach(() => {
    // Visit the test editor page before each test
    cy.visit('/test-editor');
    
    // Wait for the editor to be fully loaded
    cy.get('.codex-editor', { timeout: 10000 }).should('be.visible');
  });

  it('should load the editor successfully', () => {
    // Verify the editor is present
    cy.get('.codex-editor').should('exist');
    
    // Verify the initial placeholder text is visible
    cy.get('.ce-paragraph[data-placeholder]').should('be.visible');
  });

  it('should allow typing text', () => {
    const testText = 'This is a test paragraph';
    
    // Type some text into the editor
    cy.get('.ce-paragraph')
      .first()
      .type(testText)
      .should('contain', testText);
  });

  it('should change text to header', () => {
    const headerText = 'This is a header';
    
    // Click the toolbar button to add a header
    cy.get('.ce-toolbar__plus')
      .first()
      .click();
    
    // Select header from the block menu
    cy.get('.ce-popover__item[data-item-name=header]')
      .click();
    
    // Type header text
    cy.get('h1.ce-header')
      .type(headerText)
      .should('contain', headerText);
  });

  it('should add a list', () => {
    const listItems = ['First item', 'Second item', 'Third item'];
    
    // Add a list
    cy.get('.ce-toolbar__plus')
      .first()
      .click();
    
    cy.get('.ce-popover__item[data-item-name=list]')
      .click();
    
    // Type list items
    cy.get('.cdx-list__item')
      .first()
      .type(`${listItems[0}{enter}${listItems[1]}{enter}${listItems[2]}`);
    
    // Verify list items
    cy.get('.cdx-list__item')
      .should('have.length', 3)
      .each(($el, index) => {
        cy.wrap($el).should('contain', listItems[index]);
      });
  });

  it('should save the content', () => {
    const testContent = 'Content to be saved';
    
    // Type some content
    cy.get('.ce-paragraph')
      .first()
      .type(testContent);
    
    // Click the save button
    cy.get('button')
      .contains('Save Document')
      .click();
    
    // Verify save notification appears
    cy.contains('Content saved successfully!').should('be.visible');
    
    // Verify saved content in the preview
    cy.get('pre')
      .should('be.visible')
      .should('contain', testContent);
  });

  it('should handle different content blocks', () => {
    // Test adding a code block
    cy.get('.ce-toolbar__plus')
      .first()
      .click();
    
    cy.get('.ce-popover__item[data-item-name=code]')
      .click();
    
    const codeSnippet = 'const test = () => {\n  return "Hello, World!";\n}';
    
    cy.get('.ce-code__textarea')
      .type(codeSnippet, { delay: 0 });
    
    // Test adding a quote
    cy.get('.ce-toolbar__plus')
      .eq(1) // Second toolbar (below the code block)
      .click();
    
    cy.get('.ce-popover__item[data-item-name=quote]')
      .click();
    
    const quoteText = 'This is an important quote';
    cy.get('.cdx-quote__text')
      .type(quoteText);
    
    // Save and verify
    cy.get('button')
      .contains('Save Document')
      .click();
    
    cy.get('pre')
      .should('be.visible')
      .should('contain', codeSnippet.replace(/\n/g, '\\n'))
      .should('contain', quoteText);
  });
});
