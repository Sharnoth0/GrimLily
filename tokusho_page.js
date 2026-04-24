const DISCLOSURE_VALUE = '事業者情報の確認';
const LAST_SUBMIT_KEY = 'grimlily:tokusho-last-submit';
let lastFocusedElement = null;

const typeSelect = document.getElementById('ct_type');
const contactModal = document.getElementById('contactModal');
const thankyouModal = document.getElementById('thankyouModal');
const contactTitle = document.getElementById('contactModalTitle');
const disclosureSec = document.getElementById('disclosure_section');
const disclosureAgree = document.getElementById('disclosure_agreements');
const disclosureNotice = document.getElementById('disclosure_notice');
const contentLabel = document.getElementById('content_label_txt');
const contentHint = document.getElementById('content_hint');
const messageField = document.getElementById('ct_message');
const nameField = document.getElementById('ct_name');
const nameHint = document.getElementById('name_hint');
const emailHint = document.getElementById('email_hint');
const subjectField = document.getElementById('ct_subject');
const mLabelTxt = document.getElementById('m_label_txt');
const mSubTxt = document.getElementById('m_sub_txt');
const roleSelect = document.getElementById('dc_role');
const planLabelTxt = document.getElementById('dc_plan_label_txt');
const dateFieldWrap = document.getElementById('dc_date_field');
const dateField = document.getElementById('dc_date');
const stripeFieldWrap = document.getElementById('dc_stripe_field');
const stripeField = document.getElementById('dc_stripe');
const customerAgree = document.getElementById('dc_customer_agreement');
const contactForm = document.getElementById('contactForm');
const thanksTitle = document.getElementById('thanks_title');
const thanksSub = document.getElementById('thanks_sub');
const thanksMsg = document.getElementById('thanks_msg');
const captchaContainer = document.querySelector('.h-captcha');

// このスクリプトは tokusho.html 専用。必要な要素が揃っていないページでは早期終了する
const requiredElements = [
  typeSelect, contactModal, thankyouModal, contactTitle,
  disclosureSec, disclosureAgree, disclosureNotice,
  contentLabel, contentHint, messageField, nameField, nameHint,
  emailHint, subjectField, mLabelTxt, mSubTxt, roleSelect, planLabelTxt,
  dateFieldWrap, stripeFieldWrap, stripeField, customerAgree,
  contactForm, thanksTitle, thanksSub, thanksMsg,
];
if (requiredElements.some((element) => !element)) {
  console.warn('tokusho_page.js: 必要なDOM要素が見つからないため、初期化を中止します。');
  // 以降のコードを無効化するため、この時点でreturn相当の挙動を実現する
  throw new Error('tokusho_page.js: required DOM elements are missing.');
}

function getActiveModal() {
  return document.querySelector('.modal-overlay.active');
}

function getFocusableElements(container) {
  return Array.from(container.querySelectorAll('a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'))
    .filter((element) => !element.hidden && element.offsetParent !== null);
}

function focusFirstElement(container) {
  const first = getFocusableElements(container)[0];
  first?.focus();
}

function resetCaptcha() {
  if (window.hcaptcha && typeof window.hcaptcha.reset === 'function') {
    try {
      window.hcaptcha.reset();
    } catch (error) {
      console.warn('hCaptcha reset failed:', error);
    }
  }
}

function openModal(id, preselectType = '') {
  const modal = document.getElementById(id);
  if (!modal) {
    return;
  }

  lastFocusedElement = document.activeElement;
  modal.classList.add('active');
  document.body.classList.add('modal-open');

  if (id === 'contactModal' && typeSelect) {
    typeSelect.value = preselectType || '';
    updateDisclosureMode();
  }

  window.requestAnimationFrame(() => focusFirstElement(modal));
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) {
    return;
  }

  modal.classList.remove('active');
  if (!document.querySelector('.modal-overlay.active')) {
    document.body.classList.remove('modal-open');
  }

  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
  }
}

function showThankYou(isDisclosure) {
  if (isDisclosure) {
    thanksTitle.textContent = '確認依頼を受け付けました';
    thanksSub.textContent = 'Your request has been received';
    thanksMsg.innerHTML = '内容の確認と必要性の審査を行ったうえで、ご登録のメールアドレス宛に<br>順次ご案内いたします。<br>今しばらくお待ちくださいませ。';
  } else {
    thanksTitle.textContent = 'Thank you';
    thanksSub.textContent = 'Your message has been received';
    thanksMsg.innerHTML = 'お問い合わせ内容を受け付けました。<br>数日以内にご返信いたします。<br>今しばらくお待ちくださいませ。';
  }

  thankyouModal.classList.add('active');
  document.body.classList.add('modal-open');
  window.requestAnimationFrame(() => focusFirstElement(thankyouModal));
}

function closeThankYou() {
  thankyouModal.classList.remove('active');
  contactModal.classList.remove('active');
  document.body.classList.remove('modal-open');

  window.setTimeout(() => {
    contactForm.reset();
    resetCaptcha();
    updateDisclosureMode();
  }, 450);
}

function setDisclosureCopy(mode) {
  contactTitle.textContent = '事業者情報の確認';
  mLabelTxt.textContent = 'Business';
  mSubTxt.textContent = 'Information request';
  emailHint.textContent = 'ご案内はこのメールアドレス宛に行います。受信確認できるものをご入力ください。';

  if (mode === 'customer') {
    contentLabel.textContent = '確認を必要とされる具体的なご事情';
    messageField.placeholder = '';
    messageField.name = '確認理由';
    nameHint.innerHTML = '<strong>※ 決済時と同一のフルネーム（本名）をご記入ください。ハンドルネーム・ニックネーム不可。</strong>';
  } else if (mode === 'purchase_before') {
    contentLabel.textContent = '購入前に確認したい理由';
    messageField.placeholder = '購入前に確認したい理由と、必要な情報をご記入ください。';
    messageField.name = '確認理由';
    nameHint.innerHTML = '<strong>※ ご本人確認のため、本名または事業名をご記入ください。匿名・SNS名のみでのご連絡には対応いたしません。</strong>';
  } else {
    contentLabel.textContent = '確認内容';
    messageField.placeholder = '確認したい理由と必要性をご記入ください。';
    messageField.name = '確認理由';
    nameHint.innerHTML = '<strong>※ 確認が必要なご本人のお名前をご記入ください。匿名・SNS名のみでのご連絡には対応いたしません。</strong>';
  }

  nameHint.classList.add('hint-warn');
  nameField.placeholder = '例：山田 太郎';
  subjectField.value = '【GrimLily】事業者情報の確認依頼';
}

function setDefaultCopy() {
  contactTitle.textContent = 'お問い合わせ';
  mLabelTxt.textContent = 'Contact';
  mSubTxt.textContent = 'Get in touch with us';
  contentLabel.textContent = 'お問い合わせ内容';
  messageField.placeholder = 'お問い合わせ内容をご記入ください。';
  messageField.name = 'お問い合わせ内容';
  nameHint.textContent = 'ハンドルネーム・ニックネーム可';
  nameHint.classList.remove('hint-warn');
  nameField.placeholder = '';
  emailHint.textContent = 'ご返信はこちらのメールアドレス宛にお送りいたします。';
  subjectField.value = typeSelect.value ? `【GrimLily】お問い合わせ - ${typeSelect.value}` : '【GrimLily】お問い合わせ';
}

function updateDisclosureRole() {
  const isDisclosure = typeSelect.value === DISCLOSURE_VALUE;
  const roleValue = roleSelect ? roleSelect.value : '';
  const isCustomer = isDisclosure && roleValue === 'customer';
  const isPrePurchase = isDisclosure && roleValue === 'purchase_before';

  document.querySelectorAll('[data-dc-customer-required]').forEach((element) => {
    if (isCustomer) {
      element.setAttribute('required', '');
    } else {
      element.removeAttribute('required');
    }
  });

  dateFieldWrap.hidden = !isCustomer;
  stripeFieldWrap.hidden = !isCustomer;
  customerAgree.hidden = !isCustomer;

  if (!isDisclosure) {
    return;
  }

  planLabelTxt.textContent = isCustomer
    ? 'ご契約中・購入済みのプラン'
    : (isPrePurchase ? '検討中のプラン' : '検討中またはご契約中のプラン');

  if (isCustomer) {
    setDisclosureCopy('customer');
  } else if (isPrePurchase) {
    setDisclosureCopy('purchase_before');
  } else {
    setDisclosureCopy('initial');
  }
}

function updateDisclosureMode() {
  const isDisclosure = typeSelect.value === DISCLOSURE_VALUE;

  disclosureSec.hidden = !isDisclosure;
  disclosureAgree.hidden = !isDisclosure;
  disclosureNotice.hidden = !isDisclosure;
  contentHint.hidden = !isDisclosure;

  document.querySelectorAll('[data-dc-required]').forEach((element) => {
    if (isDisclosure) {
      element.setAttribute('required', '');
    } else {
      element.removeAttribute('required');
    }
  });

  if (isDisclosure) {
    updateDisclosureRole();
  } else {
    if (roleSelect) {
      roleSelect.value = '';
    }
    dateFieldWrap.hidden = true;
    stripeFieldWrap.hidden = true;
    customerAgree.hidden = true;
    setDefaultCopy();
  }
}

function trimFieldValue(field) {
  if (!field) {
    return '';
  }
  field.value = field.value.trim();
  return field.value;
}

function hasCaptchaToken() {
  const responseField = contactForm.querySelector('textarea[name="h-captcha-response"]');
  return Boolean(responseField && responseField.value.trim());
}

function validateDisclosureRequest() {
  if (!roleSelect.value) {
    alert('確認区分を選択してください。');
    roleSelect.focus();
    return false;
  }

  const checkedItems = contactForm.querySelectorAll('input[name="確認希望情報"]:checked');
  if (checkedItems.length === 0) {
    alert('確認をご希望の情報を1つ以上選択してください。');
    document.getElementById('dc_items_grp').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
  }

  if (messageField.value.trim().length < 20) {
    alert('確認理由は20文字以上で、必要性が分かるよう具体的にご記入ください。');
    messageField.focus();
    return false;
  }

  return true;
}

document.addEventListener('click', (event) => {
  const openButton = event.target.closest('[data-open-modal]');
  if (openButton) {
    openModal(openButton.dataset.openModal, openButton.dataset.preselectType || '');
    return;
  }

  const closeButton = event.target.closest('[data-close-modal]');
  if (closeButton) {
    closeModal(closeButton.dataset.closeModal);
    return;
  }

  if (event.target.closest('[data-close-thankyou]')) {
    closeThankYou();
    return;
  }

  if (event.target.classList.contains('modal-overlay')) {
    if (event.target.id === 'thankyouModal') {
      closeThankYou();
    } else {
      closeModal(event.target.id);
    }
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (thankyouModal.classList.contains('active')) {
      closeThankYou();
      return;
    }

    const activeModal = getActiveModal();
    if (activeModal) {
      closeModal(activeModal.id);
    }
    return;
  }

  if (event.key !== 'Tab') {
    return;
  }

  const activeModal = getActiveModal();
  if (!activeModal) {
    return;
  }

  const focusable = getFocusableElements(activeModal);
  if (focusable.length === 0) {
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

if (dateField) {
  dateField.max = new Date().toISOString().slice(0, 10);
}

if (typeSelect) {
  typeSelect.addEventListener('change', updateDisclosureMode);
}

if (roleSelect) {
  roleSelect.addEventListener('change', updateDisclosureRole);
}

if (contactForm) {
  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    trimFieldValue(nameField);
    trimFieldValue(messageField);
    trimFieldValue(stripeField);

    const isDisclosure = typeSelect.value === DISCLOSURE_VALUE;
    const now = Date.now();
    const lastSubmitted = Number(window.sessionStorage.getItem(LAST_SUBMIT_KEY) || 0);

    if (now - lastSubmitted < 15000) {
      alert('短時間の連続送信を防ぐため、15秒ほど待ってから再度お試しください。');
      return;
    }

    if (isDisclosure && !validateDisclosureRequest()) {
      return;
    }

    if (!hasCaptchaToken()) {
      alert('送信前に認証を完了してください。');
      captchaContainer?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const submitButton = contactForm.querySelector('.submit-btn');
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.setAttribute('aria-busy', 'true');
    submitButton.textContent = '送信中...';

    try {
      const response = await fetch(contactForm.action, {
        method: 'POST',
        body: new FormData(contactForm),
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'strict-origin-when-cross-origin',
      });

      const result = await response.json();
      if (response.ok && result.success) {
        window.sessionStorage.setItem(LAST_SUBMIT_KEY, String(now));
        showThankYou(isDisclosure);
      } else if (response.status === 429) {
        alert('短時間に送信が集中しています。少し時間をおいてから再度お試しください。');
      } else {
        alert(`送信に失敗しました：${result.message || '時間をおいて再度お試しください。'}`);
      }
    } catch (error) {
      console.error(error);
      alert('送信中にエラーが発生しました。インターネット接続をご確認のうえ、再度お試しください。');
    } finally {
      submitButton.disabled = false;
      submitButton.removeAttribute('aria-busy');
      submitButton.textContent = originalText;
    }
  });
}

updateDisclosureMode();
