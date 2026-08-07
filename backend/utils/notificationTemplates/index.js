const enBookingTemplates = require("./en/booking");
const enProviderTemplates = require("./en/provider");

const registries = {
  en: {
    ...enBookingTemplates,
    ...enProviderTemplates,
  },
};

const DEFAULT_LOCALE = "en";

const getTemplate = (templateKey, locale = DEFAULT_LOCALE) => {
  const localeTemplates = registries[locale] || registries[DEFAULT_LOCALE];
  const template = localeTemplates[templateKey] || registries[DEFAULT_LOCALE][templateKey];

  if (!template) {
    throw new Error(`Notification template not found: ${templateKey}`);
  }

  return template;
};

const renderTemplate = (templateKey, context, locale = DEFAULT_LOCALE) =>
  getTemplate(templateKey, locale)(context || {});

module.exports = {
  getTemplate,
  renderTemplate,
};
