
'use strict';
(() => {
  const form = document.querySelector('#project-contact-form');
  const status = document.querySelector('#contact-form-status');
  const draft = document.querySelector('#contact-draft');
  const fields = [...form.querySelectorAll('[required]')];
  const errorFor = field => document.querySelector(`#${field.id}-error`);
  function validate(field) {
    const valid = field.value.trim() !== '' && field.checkValidity();
    field.setAttribute('aria-invalid', String(!valid));
    errorFor(field).textContent = valid ? '' : field.type === 'email' && field.value.trim() ? 'Indiquez une adresse email valide.' : 'Veuillez compléter ce champ.';
    return valid;
  }
  fields.forEach(field => field.addEventListener('input', () => {
    if (field.hasAttribute('aria-invalid')) validate(field);
  }));
  form.addEventListener('input', () => { draft.hidden = true; status.textContent = ''; });
  form.addEventListener('change', () => { draft.hidden = true; status.textContent = ''; });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const invalid = fields.filter(field => !validate(field));
    if (invalid.length) {
      draft.hidden = true;
      status.textContent = 'Vérifiez les champs indiqués avant de préparer votre email.';
      invalid[0].focus();
      return;
    }
    const data = new FormData(form);
    const value = name => String(data.get(name) || '').trim();
    const lines = [`Bonjour Wael,`, '', `Nom : ${value('name')}`, `Email : ${value('email')}`, `Besoin : ${value('service')}`];
    for (const [name, label] of [['phone','Téléphone'],['budget','Budget indicatif'],['country','Pays']]) {
      if (value(name)) lines.push(`${label} : ${value(name)}`);
    }
    lines.push('', value('message'));
    const body = lines.join('\n');
    const subject = `Projet — ${value('service')} — ${value('name')}`;
    document.querySelector('#contact-draft-link').href = `mailto:refaiwael@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    document.querySelector('#contact-draft-preview').textContent = body;
    draft.hidden = false;
    status.textContent = 'Brouillon préparé. Relisez-le puis ouvrez votre messagerie pour l’envoyer.';
  });
})();
