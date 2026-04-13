const studentSearch = document.getElementById('studentSearch');
const suggestions = document.getElementById('studentSuggestions');
const summary = document.getElementById('studentSummary');
const form = document.getElementById('healthRecordForm');
const statusEl = document.getElementById('formStatus');

const fields = {
  reg: document.getElementById('reg'),
  name: document.getElementById('name'),
  studentClass: document.getElementById('studentClass'),
  section: document.getElementById('section'),
  roll: document.getElementById('roll'),
  fatherName: document.getElementById('fatherName'),
  address: document.getElementById('address')
};

const debounce = (fn, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

const renderSummary = (student) => {
  if (!student) {
    summary.innerHTML = '<p class="hm-muted">No student selected yet.</p>';
    return;
  }

  summary.innerHTML = `
    <div class="hm-summary-grid">
      <div><strong>Name</strong><span>${student.name || '-'}</span></div>
      <div><strong>Reg</strong><span>${student.reg || '-'}</span></div>
      <div><strong>Class</strong><span>${student.studentClass || '-'}</span></div>
      <div><strong>Section</strong><span>${student.section || '-'}</span></div>
      <div><strong>Roll</strong><span>${student.roll || '-'}</span></div>
      <div><strong>Father</strong><span>${student.fatherName || '-'}</span></div>
      <div><strong>Address</strong><span>${student.address || '-'}</span></div>
    </div>
  `;
};

const setStudent = (student) => {
  fields.reg.value = student.reg || '';
  fields.name.value = student.name || '';
  fields.studentClass.value = student.studentClass || '';
  fields.section.value = student.section || '';
  fields.roll.value = student.roll || '';
  fields.fatherName.value = student.fatherName || '';
  fields.address.value = student.address || '';
  studentSearch.value = student.name || '';
  renderSummary(student);
};

const clearSuggestions = () => {
  suggestions.innerHTML = '';
  suggestions.style.display = 'none';
};

const showSuggestions = (items) => {
  if (!items.length) {
    suggestions.innerHTML = '<div class="hm-suggestion-item"><span class="hm-suggestion-meta">No matches found</span></div>';
    suggestions.style.display = 'block';
    return;
  }

  suggestions.innerHTML = items.map((student) => {
    const meta = `Class ${student.studentClass || '-'} | Roll ${student.roll || '-'} | Section ${student.section || '-'}`;
    const guardian = `Father: ${student.fatherName || '-'} | Address: ${student.address || '-'}`;
    return `
      <div class="hm-suggestion-item" data-student='${JSON.stringify(student)}'>
        <span class="hm-suggestion-name">${student.name || '-'}</span>
        <span class="hm-suggestion-meta">${meta}</span>
        <span class="hm-suggestion-meta">${guardian}</span>
      </div>
    `;
  }).join('');

  suggestions.style.display = 'block';
};

const fetchStudents = async () => {
  const value = studentSearch.value.trim();
  if (value.length < 2) {
    clearSuggestions();
    return;
  }

  try {
    const response = await fetch(`/healthrecord/students?q=${encodeURIComponent(value)}`);
    const data = await response.json();
    showSuggestions(data);
  } catch (error) {
    clearSuggestions();
  }
};

studentSearch.addEventListener('input', debounce(fetchStudents, 200));

suggestions.addEventListener('click', (event) => {
  const item = event.target.closest('.hm-suggestion-item');
  if (!item || !item.dataset.student) {
    return;
  }
  const student = JSON.parse(item.dataset.student);
  setStudent(student);
  clearSuggestions();
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.hm-field')) {
    clearSuggestions();
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!fields.reg.value || !fields.name.value) {
    statusEl.textContent = 'Select a student from the suggestions first.';
    return;
  }
  statusEl.textContent = 'Saving health record...';

  const formData = new FormData(form);
  const payload = new URLSearchParams(formData);

  try {
    const response = await fetch('/healthrecord', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload
    });

    if (!response.ok) {
      throw new Error('Failed');
    }

    statusEl.textContent = 'Health record saved successfully.';
    form.reset();
    renderSummary(null);
  } catch (error) {
    statusEl.textContent = 'Unable to save health record. Please try again.';
  }
});

renderSummary(null);
