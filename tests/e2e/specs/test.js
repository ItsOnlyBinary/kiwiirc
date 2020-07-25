// https://docs.cypress.io/api/introduction/api.html

describe('My First Test', () => {
    it('Visits the app root url', () => {
        cy.visit('/');

        // Wait for app to be ready
        cy.window().should('have.property', 'appReady', true);

        // Change server settings
        cy.window().then((win) => {
            const settings = win.kiwi.state.settings;
            settings.startupOptions.server = 'irc.chillspot.org';
            settings.startupOptions.port = 8081;
            settings.startupOptions.tls = true;
            settings.startupOptions.direct = true;
            console.log('settings set');
        });

        // Wait for server to update
        cy.window().should('have.deep.property', 'kiwi.state.settings.startupOptions.server', 'irc.chillspot.org');

        // Find Channel box and change the default channels
        cy.contains('.u-input-text', 'Channel').find('input').clear().type('#cypress1,#cypress2,#cypress3');

        // Click connect
        cy.get('.kiwi-welcome-simple-start').click();

        // Type into ControlInput.vue and press enter
        cy.get('.kiwi-ircinput-editor').type('kiwi irc rocks :D {enter}');

        // Check the message ends up in the message list
        cy.get('.kiwi-messagelist-body').should((el) => {
            expect(el).to.contain('kiwi irc rocks');
            expect(el).to.not.contain('foo');
        });

        // Change channel
        cy.get('.kiwi-statebrowser-channel-name').contains('#cypress2').click();

        // Check the channel changed
        cy.get('.kiwi-header-name').should('have.text', '#cypress2');

        // Check the previous message is not in the new channel
        cy.get('.kiwi-messagelist-body').should((el) => {
            expect(el).to.not.contain('kiwi irc rocks');
        });
    });
});
