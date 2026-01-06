function calendarOverlayHandler(overlayElement) {

  return new Promise((resolve, reject) => {
    
    const root = overlayElement; 

    // 1) HTML-layout
    root.innerHTML = `
      <div id="calendar-wrapper">
        <h3>Vælg en tid til møde</h3>
        <div id="slots"></div>
        <button id="confirm" disabled>Book møde</button>
      </div>
    `;

    const slotsDiv = root.querySelector('#slots'); // Bruger root.querySelector for sikkerhed
    const confirmBtn = root.querySelector('#confirm');

    let selectedSlot = null;

    // 2) Hent ledige tider fra Logic App
    fetch('https://prod-230.westeurope.logic.azure.com:443/workflows/ffa839ceb19540cc93354363935fdf98/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=c9Y1kq_l_huBc5qoIv4bv8otpm6B3HrBD6w509PWvQA', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        advisorId: '123',
        fromDate: '2025-11-21',
        toDate: '2025-11-28'
      })
    })
      .then(r => r.json())
      .then(data => {
        if (!data.slots || !data.slots.length) {
          slotsDiv.innerHTML = '<p>Ingen ledige tider i denne periode.</p>';
          return;
        }

        data.slots.forEach(slot => {
          const btn = document.createElement('button');
          btn.textContent = new Date(slot.start).toLocaleString('da-DK');
          btn.onclick = () => {
            selectedSlot = slot;
            confirmBtn.disabled = false;
            
            // Visuel feedback på valg (valgfrit, men god UX)
            const allBtns = slotsDiv.querySelectorAll('button');
            allBtns.forEach(b => b.style.backgroundColor = ''); // Nulstil farver
            btn.style.backgroundColor = '#ccc'; // Marker valgt
          };
          slotsDiv.appendChild(btn);
        });
      })
      .catch(err => {
        console.error(err);
        // Hvis vi ikke kan hente tider, bør vi rydde op og returnere false
        root.innerHTML = '';
        resolve(false);
      });

    // 3) Når bruger klikker "Book møde"
    confirmBtn.onclick = () => {
      if (!selectedSlot) return;

      // Deaktiver knap for at undgå dobbeltklik
      confirmBtn.textContent = 'Booker...';
      confirmBtn.disabled = true;

      fetch('https://prod-179.westeurope.logic.azure.com:443/workflows/88522a9088a04f6884c8f87cb16f8b15/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=Otm0k1vWStEZ-AwyrJOaX-295hP_XJ9CXAs_xou0hi8', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: selectedSlot.id,
          start: selectedSlot.start,
          end: selectedSlot.end,
          customerName: window.puzzelCustomerName || 'Ukendt',
          customerEmail: window.puzzelCustomerEmail || ''
        })
      })
        .then(r => r.json())
        .then(result => {
          root.innerHTML = '';

          if (result.status === 'ok' || result.bookingId) {
             resolve(true); 
          } else {
             resolve(false);
          }
        })
        .catch(err => {
          console.error(err);
          root.innerHTML = '';
          
          resolve(false); 
        });
    };
  });
}

window.calendarOverlayHandler = calendarOverlayHandler;

