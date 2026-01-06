function calendarOverlayHandler(overlayElement) {
  // 1. CSS STYLING (Så det ser pænt ud med det samme)
  const style = document.createElement('style');
  style.innerHTML = `
    #calendar-wrapper { font-family: sans-serif; padding: 15px; background: #fff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    #slots { display: flex; flex-wrap: wrap; gap: 10px; margin: 15px 0; max-height: 200px; overflow-y: auto; }
    #slots button { flex: 1 0 45%; padding: 10px; border: 1px solid #0078d4; background: #fff; color: #0078d4; cursor: pointer; border-radius: 4px; }
    #slots button:hover { background: #e6f2fb; }
    #confirm { width: 100%; padding: 12px; background: #0078d4; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
    #confirm:disabled { background: #ccc; cursor: not-allowed; }
  `;
  overlayElement.appendChild(style);

  return new Promise((resolve, reject) => {
    const root = overlayElement; 

    // 2. HTML LAYOUT
    root.innerHTML += `
      <div id="calendar-wrapper">
        <h3>📅 Vælg en tid til møde</h3>
        <p style="font-size:0.9em; color:#666;">Vi søger efter tider de næste 7 dage...</p>
        <div id="slots">Finder ledige tider...</div>
        <button id="confirm" disabled>Bekræft booking</button>
      </div>
    `;

    const slotsDiv = root.querySelector('#slots');
    const confirmBtn = root.querySelector('#confirm');
    let selectedSlot = null;

    // 3. DYNAMISKE DATOER (VIGTIG ÆNDRING!)
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7); // Lægger 7 dage til i dag

    // Logic App 1: Hent tider
    // BEMÆRK: Erstat URL med din egen, hvis den ændrer sig
    const fetchUrl = 'https://prod-230.westeurope.logic.azure.com:443/workflows/ffa839ceb19540cc93354363935fdf98/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=c9Y1kq_l_huBc5qoIv4bv8otpm6B3HrBD6w509PWvQA';
    
    fetch(fetchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        advisorId: '123', // Dette bør måske også være dynamisk?
        fromDate: today.toISOString().split('T')[0], // Sender f.eks. "2023-10-27"
        toDate: nextWeek.toISOString().split('T')[0]
      })
    })
      .then(r => r.json())
      .then(data => {
        slotsDiv.innerHTML = ''; // Fjern "Finder ledige tider..."

        // Tjek om API'et returnerede slots korrekt (nogle gange ligger de inde i en 'value' eller body)
        const slots = data.slots || data; 

        if (!slots || !slots.length) {
          slotsDiv.innerHTML = '<p>Ingen ledige tider fundet den næste uge.</p>';
          return;
        }

        slots.forEach(slot => {
          const btn = document.createElement('button');
          // Gør datoen læsbar (Dansk format)
          const dateObj = new Date(slot.start);
          const timeStr = dateObj.toLocaleTimeString('da-DK', {hour: '2-digit', minute:'2-digit'});
          const dateStr = dateObj.toLocaleDateString('da-DK', {weekday: 'short', day: 'numeric', month: 'short'});
          
          btn.innerHTML = `<strong>${dateStr}</strong><br>kl. ${timeStr}`;
          
          btn.onclick = () => {
            selectedSlot = slot;
            confirmBtn.disabled = false;
            confirmBtn.textContent = `Book tid: ${dateStr} kl. ${timeStr}`;
            
            // Visuel feedback
            const allBtns = slotsDiv.querySelectorAll('button');
            allBtns.forEach(b => {
                b.style.background = '#fff';
                b.style.color = '#0078d4';
            }); 
            btn.style.background = '#0078d4';
            btn.style.color = '#fff';
          };
          slotsDiv.appendChild(btn);
        });
      })
      .catch(err => {
        console.error("Fejl ved hentning:", err);
        slotsDiv.innerHTML = '<p style="color:red">Der skete en fejl. Prøv igen senere.</p>';
      });

    // 4. BOOKING HANDLER
    confirmBtn.onclick = () => {
      if (!selectedSlot) return;

      confirmBtn.textContent = 'Booker din tid...';
      confirmBtn.disabled = true;

      // Logic App 2: Book tiden
      const bookUrl = 'https://prod-179.westeurope.logic.azure.com:443/workflows/88522a9088a04f6884c8f87cb16f8b15/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=Otm0k1vWStEZ-AwyrJOaX-295hP_XJ9CXAs_xou0hi8';

      fetch(bookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: selectedSlot.id,
          start: selectedSlot.start,
          end: selectedSlot.end,
          // Bruger Puzzel variabler hvis de findes, ellers standard
          customerName: window.puzzelCustomerName || 'Test Medlem',
          customerEmail: window.puzzelCustomerEmail || 'test@test.dk'
        })
      })
        .then(r => r.json())
        .then(result => {
            // Vi antager at Logic App sender { "status": "ok" } eller lignende
            root.innerHTML = `
                <div style="text-align:center; padding:20px; color:green;">
                    <h3>✅ Tak for din booking!</h3>
                    <p>Vi har reserveret tiden til dig.</p>
                </div>
            `;
            // Vent 3 sekunder så brugeren kan læse beskeden, og meld så "Succes" tilbage til systemet
            setTimeout(() => {
                resolve(true);
            }, 3000);
        })
        .catch(err => {
          console.error(err);
          confirmBtn.textContent = 'Fejl - prøv igen';
          confirmBtn.disabled = false;
          // Her vælger vi IKKE at lukke vinduet (resolve), så brugeren kan prøve igen
        });
    };
  });
}

// Gør funktionen tilgængelig globalt
window.calendarOverlayHandler = calendarOverlayHandler;
