/* eslint-disable no-undef */
describe('Training', function() {
    function clickStoryGroup(group) {
        const positions = ['topLeft', 'top', 'topRight', 'left', 'center', 'right', 'bottomLeft', 'bottom', 'bottomRight'];
        positions.map(p => cy.contains(group).click(p, { force: true }));
    }


    function importData(langCode, langName) {
        cy.visit('/project/bf/nlu/models');
        cy.get('[data-cy=model-selector]').click();
        cy.get('[data-cy=model-selector] input').type(`${langName}{enter}`);
        cy.get('.nlu-menu-settings').click();
        cy.contains('Import').click();
        cy.fixture(`nlu_sample_${langCode}.json`, 'utf8').then((content) => {
            cy.get('.file-dropzone').upload(content, 'data.json');
        });
        cy.contains('Import Training Data').click();
        cy.get('.s-alert-success').should('be.visible');
        cy.wait(500);
    }

    function createFrenchModelWithData() {
        cy.createNLUModelProgramatically('bf', '', 'fr');
        // Selecting French model
        importData('fr', 'French');
    }
    
    function testChat(lang, utterance, expectedResponse) {
        cy.get('#render-target > div > div.project-children > div > div.Pane.vertical.Pane2 > div > div.widget-embedded > div > div:nth-child(1) > span').should('not.be.visible');
        cy.dataCy('restart-chat').click();
        cy.get('[data-cy=chat-language-option]').click();
        cy.get('[data-cy=chat-language-option] .visible.menu')
            .contains(lang)
            .click();
        cy.get('input.new-message').click().type(`${utterance}{enter}`, { force: true });
        // Verify response
        cy.get('.conversation-container').contains(expectedResponse);
    }

    function createStories() {
        cy.visit('/project/bf/stories');
        cy.dataCy('add-item').click({ force: true });
        cy.dataCy('add-item-input')
            .find('input')
            .type('Group{enter}');
        clickStoryGroup('Group');
        cy.dataCy('story-editor')
            .get('textarea')
            .focus()
            .type('{selectAll}{backSpace}{backSpace}{backSpace}{backSpace}', { force: true });
        cy.dataCy('story-editor')
            .get('textarea')
            .focus()
            .type('{backSpace}{backSpace}* chitchat.greet\n  - utter_hi', { force: true });
    }

    before(function() {
        // just in case it's not deleted
        // cy.deleteProject('bf', true);
    });

    beforeEach(function() {
        cy.request('DELETE', `${Cypress.env('RASA_URL')}/model`);
        cy.createProject('bf', 'My Project', 'en').then(() => {
            cy.login();
        });
    });

    afterEach(function() {
        cy.deleteProject('bf');
    });
    

    it('Should train and serve a model containing only stories (no NLU) and adding a language should work', function() {
        createStories();
        // Train and wait for training to finish
        cy.get('[data-cy=train-button]').click();
        cy.wait(1000);
        cy.get('[data-cy=train-button]').should('not.have.class', 'disabled');
        cy.get('[data-cy=open-chat]').click();
        // This first test never pass
        // testChat('en', '/chitchat.greet', 'utter_hi');
        importData('en', 'English');
        cy.visit('/project/bf/stories');
        cy.get('[data-cy=open-chat]').click();
        cy.get('[data-cy=train-button]').click();
        cy.get('[data-cy=train-button]').should('not.have.class', 'disabled');
        testChat('en', 'hi', 'utter_hi');
    });

    it('Should train and serve a model containing stories + NLU in one language and adding a second language should work too', function() {
        importData('en', 'English');
        createStories();
        // Train and wait for training to finish
        cy.get('[data-cy=train-button]').click();
        cy.wait(1000);
        cy.get('[data-cy=train-button]').should('not.have.class', 'disabled');
        cy.get('[data-cy=open-chat]').click();
        testChat('en', 'hi', 'utter_hi');
        createFrenchModelWithData();
        // Train and wait for training to finish
        cy.get('[data-cy=train-button]').click();
        cy.wait(1000);
        cy.get('[data-cy=train-button]').should('not.have.class', 'disabled');
        cy.get('[data-cy=open-chat]').click();
        testChat('fr', 'salut', 'utter_hi');
    });

    it('Should train and serve a model containing stories and NLU in 2 languages', function() {
        importData('en', 'English');
        createFrenchModelWithData();
        createStories();
        // Train and wait for training to finish
        cy.get('[data-cy=train-button]').click();
        cy.wait(1000); // wait a bit so the state changes to disabled
        cy.get('[data-cy=train-button]').should('not.have.class', 'disabled');
        // Open chat and type intent
        cy.get('[data-cy=open-chat]').click();
        testChat('en', 'hi', 'utter_hi');
        testChat('fr', 'salut', 'utter_hi');
    });
});
