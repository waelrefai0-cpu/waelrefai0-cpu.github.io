
'use strict';
(() => {
  const form = document.querySelector('#project-contact-form');
  const status = document.querySelector('#contact-form-status');
  const draft = document.querySelector('#contact-draft');
  const fields = [...form.querySelectorAll('[required]')];
  const t = text => window.portfolioI18n?.t(text) || text;
  const errorFor = field => document.querySelector(`#${field.id}-error`);
  function validate(field) {
    const valid = field.value.trim() !== '' && field.checkValidity();
    field.setAttribute('aria-invalid', String(!valid));
    errorFor(field).textContent = valid ? '' : t(field.type === 'email' && field.value.trim() ? 'Indiquez une adresse email valide.' : 'Veuillez compléter ce champ.');
    return valid;
  }
  fields.forEach(field => field.addEventListener('input', () => {
    if (field.hasAttribute('aria-invalid')) validate(field);
  }));
  form.addEventListener('input', () => { draft.hidden = true; status.textContent = ''; });
  form.addEventListener('change', () => { draft.hidden = true; status.textContent = ''; });
  let submitted = false;
  function prepareDraft() {
    submitted = true;
    const invalid = fields.filter(field => !validate(field));
    if (invalid.length) {
      draft.hidden = true;
      status.textContent = t('Vérifiez les champs indiqués avant de préparer votre email.');
      invalid[0].focus();
      return;
    }
    const data = new FormData(form);
    const value = name => String(data.get(name) || '').trim();
    const service = t(value('service'));
    const lines = [t('Bonjour Wael,'), '', `${t('Nom')} : ${value('name')}`, `Email : ${value('email')}`, `${t('Besoin')} : ${service}`];
    for (const [name, label] of [['phone','Téléphone'],['budget','Budget indicatif'],['country','Pays']]) {
      if (value(name)) lines.push(`${t(label)} : ${value(name)}`);
    }
    lines.push('', value('message'));
    const body = lines.join('\n');
    const subject = `${t('Projet')} — ${service} — ${value('name')}`;
    document.querySelector('#contact-draft-link').href = `mailto:refaiwael@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    document.querySelector('#contact-draft-preview').textContent = body;
    draft.hidden = false;
    status.textContent = t('Brouillon préparé. Relisez-le puis ouvrez votre messagerie pour l’envoyer.');
  }
  form.addEventListener('submit', event => { event.preventDefault(); prepareDraft(); });
  document.addEventListener('portfolio:languagechange', () => {
    fields.filter(field => field.hasAttribute('aria-invalid')).forEach(validate);
    if (!draft.hidden) prepareDraft();
    else if (submitted && fields.some(field => field.getAttribute('aria-invalid') === 'true')) status.textContent = t('Vérifiez les champs indiqués avant de préparer votre email.');
  });
})();
