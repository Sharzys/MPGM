// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDQuf7Pguje9A3XoIG1H_InDx4nLZWtuYg",
    authDomain: "mpmg-df88b.firebaseapp.com",
    projectId: "mpmg-df88b",
    storageBucket: "mpmg-df88b.appspot.com",
    messagingSenderId: "908511339384",
    appId: "1:908511339384:web:7ee14ab4addefd7d889e8d",
    measurementId: "G-KV57V7SEEJ"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Check authentication state
auth.onAuthStateChanged((user) => {
    if (!user) {
        // Not logged in, redirect to login page
        window.location.href = 'index.html';
    } else {
        // User is logged in, initialize the dashboard
        initDashboard();
    }
});

// Logout functionality
document.getElementById('logoutBtn').addEventListener('click', () => {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
});

// Initialize the dashboard
function initDashboard() {
    console.log("Initializing dashboard...");
    
    // Debug: check what collections exist
    debugCollections();
    
    // Set up navigation
    setupNavigation();
    
    // Load data for the dashboard
    loadDashboardData();
    
    // Load registrations
    loadRegistrations();
    
    // Load RSVPs
    loadRSVPs();
    
    // Load messages
    loadMessages();
    
    // Load donations
    loadDonations();
    
    // Load events
    loadEvents();
    
    // Set up event modal
    setupEventModal();
}

// Debug function to check available collections
function debugCollections() {
    console.log("Checking available collections...");
    
    const collections = ['registrations', 'rsvps', 'contact_messages', 'donations', 'events', 'contactSubmissions', 'contacts', 'messages'];
    
    collections.forEach(collectionName => {
        db.collection(collectionName).limit(1).get()
            .then(snapshot => {
                console.log(`Collection "${collectionName}": ${snapshot.size} documents`);
                if (snapshot.size > 0) {
                    snapshot.forEach(doc => {
                        console.log(`Sample document in ${collectionName}:`, doc.data());
                    });
                }
            })
            .catch(error => {
                console.log(`Collection "${collectionName}": Error - ${error.message}`);
            });
    });
}

// Set up navigation between sections
function setupNavigation() {
    const navItems = document.querySelectorAll('.sidebar-nav li');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all items
            navItems.forEach(navItem => navItem.classList.remove('active'));
            
            // Add active class to clicked item
            item.classList.add('active');
            
            // Hide all sections
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.remove('active');
            });
            
            // Show the selected section
            const sectionId = item.getAttribute('data-section') + '-section';
            document.getElementById(sectionId).classList.add('active');
            
            // Update the content title
            document.getElementById('content-title').textContent = item.querySelector('span').textContent;
        });
    });
}

// Load dashboard overview data
function loadDashboardData() {
    // Count registrations - try multiple possible collection names
    Promise.all([
        db.collection('registrations').get().catch(() => ({ size: 0 })),
        db.collection('users').get().catch(() => ({ size: 0 }))
    ]).then(([registrations, users]) => {
        const totalRegistrations = registrations.size + users.size;
        document.getElementById('registrations-count').textContent = totalRegistrations;
    });
    
    // Count RSVPs
    db.collection('rsvps').get().then(snapshot => {
        document.getElementById('rsvps-count').textContent = snapshot.size;
    }).catch(error => {
        console.error('Error counting RSVPs:', error);
        document.getElementById('rsvps-count').textContent = '0';
    });
    
    // Count messages - try multiple possible collection names
    Promise.all([
        db.collection('contact_messages').get().catch(() => ({ size: 0 })),
        db.collection('contactSubmissions').get().catch(() => ({ size: 0 })),
        db.collection('contacts').get().catch(() => ({ size: 0 })),
        db.collection('messages').get().catch(() => ({ size: 0 }))
    ]).then(([contactMessages, contactSubmissions, contacts, messages]) => {
        const totalMessages = contactMessages.size + contactSubmissions.size + contacts.size + messages.size;
        document.getElementById('messages-count').textContent = totalMessages;
    });
    
    // Count and sum donations
    db.collection('donations').get().then(snapshot => {
        document.getElementById('donations-count').textContent = snapshot.size;
        
        let total = 0;
        let oneTimeTotal = 0;
        let monthlyTotal = 0;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const amount = parseFloat(data.amount) || 0;
            total += amount;
            
            if (data.isRecurring) {
                monthlyTotal += amount;
            } else {
                oneTimeTotal += amount;
            }
        });
        
        document.getElementById('total-donations').textContent = 'R' + total.toFixed(2);
        document.getElementById('one-time-donations').textContent = 'R' + oneTimeTotal.toFixed(2);
        document.getElementById('monthly-donations').textContent = 'R' + monthlyTotal.toFixed(2);
    }).catch(error => {
        console.error('Error loading donations:', error);
        document.getElementById('donations-count').textContent = '0';
        document.getElementById('total-donations').textContent = 'R0.00';
        document.getElementById('one-time-donations').textContent = 'R0.00';
        document.getElementById('monthly-donations').textContent = 'R0.00';
    });
    
    // Load recent activity
    const activityList = document.getElementById('recent-activity');
    
    // Combine queries to get recent activity from multiple collections
    Promise.all([
        db.collection('registrations').orderBy('timestamp', 'desc').limit(3).get().catch(() => ({ forEach: () => {} })),
        db.collection('rsvps').orderBy('timestamp', 'desc').limit(3).get().catch(() => ({ forEach: () => {} })),
        db.collection('contact_messages').orderBy('timestamp', 'desc').limit(3).get().catch(() => ({ forEach: () => {} })),
        db.collection('contactSubmissions').orderBy('timestamp', 'desc').limit(3).get().catch(() => ({ forEach: () => {} })),
        db.collection('contacts').orderBy('timestamp', 'desc').limit(3).get().catch(() => ({ forEach: () => {} })),
        db.collection('messages').orderBy('timestamp', 'desc').limit(3).get().catch(() => ({ forEach: () => {} })),
        db.collection('donations').orderBy('timestamp', 'desc').limit(3).get().catch(() => ({ forEach: () => {} }))
    ]).then(([registrations, rsvps, contactMessages, contactSubmissions, contacts, messages, donations]) => {
        activityList.innerHTML = '';
        
        let hasActivity = false;

        // Process registrations
        registrations.forEach(doc => {
            hasActivity = true;
            const data = doc.data();
            const date = data.timestamp?.toDate() || new Date();
            
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.innerHTML = `
                <div class="activity-icon">
                    <i class="fas fa-user-plus"></i>
                </div>
                <div class="activity-details">
                    <h4>New registration: ${data.fullName || data.name || 'Unknown'}</h4>
                    <p>${formatDate(date)}</p>
                </div>
            `;
            
            activityList.appendChild(activityItem);
        });
        
        // Process RSVPs
        rsvps.forEach(doc => {
            hasActivity = true;
            const data = doc.data();
            const date = data.timestamp?.toDate() || new Date();
            
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.innerHTML = `
                <div class="activity-icon">
                    <i class="fas fa-calendar-check"></i>
                </div>
                <div class="activity-details">
                    <h4>RSVP for ${data.eventTitle || 'Event'} by ${data.attendeeName || 'Guest'}</h4>
                    <p>${formatDate(date)}</p>
                </div>
            `;
            
            activityList.appendChild(activityItem);
        });
        
        // Process messages from all possible collections
        const processMessage = (data, source) => {
            hasActivity = true;
            const date = data.timestamp?.toDate() || new Date();
            
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.innerHTML = `
                <div class="activity-icon">
                    <i class="fas fa-envelope"></i>
                </div>
                <div class="activity-details">
                    <h4>New message from ${data.name || data.fullName || 'Unknown'} about ${data.subject || 'General Inquiry'}</h4>
                    <p>${formatDate(date)} (${source})</p>
                </div>
            `;
            
            activityList.appendChild(activityItem);
        };

        contactMessages.forEach(doc => processMessage(doc.data(), 'contact_messages'));
        contactSubmissions.forEach(doc => processMessage(doc.data(), 'contactSubmissions'));
        contacts.forEach(doc => processMessage(doc.data(), 'contacts'));
        messages.forEach(doc => processMessage(doc.data(), 'messages'));
        
        // Process donations
        donations.forEach(doc => {
            hasActivity = true;
            const data = doc.data();
            const date = parseTimestamp(data.timestamp);
            
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.innerHTML = `
                <div class="activity-icon">
                    <i class="fas fa-donate"></i>
                </div>
                <div class="activity-details">
                    <h4>Donation of R${(data.amount || 0).toFixed(2)} by ${data.donorName || data.name || 'Anonymous'}</h4>
                    <p>${formatDate(date)}</p>
                </div>
            `;
            
            activityList.appendChild(activityItem);
        });

        if (!hasActivity) {
            activityList.innerHTML = '<div class="activity-item"><div class="activity-details"><h4>No recent activity</h4><p>Activity will appear here as users interact with your site</p></div></div>';
        }
    });
}

// Load registrations data
function loadRegistrations() {
    const registrationsTable = document.querySelector('#registrations-table tbody');
    
    // Try multiple collection names for registrations
    Promise.all([
        db.collection('registrations').orderBy('timestamp', 'desc').get().catch(() => ({ forEach: () => {} })),
        db.collection('users').orderBy('timestamp', 'desc').get().catch(() => ({ forEach: () => {} }))
    ]).then(([registrations, users]) => {
        registrationsTable.innerHTML = '';
        
        let hasData = false;

        // Process registrations collection
        registrations.forEach(doc => {
            hasData = true;
            const data = doc.data();
            const date = data.timestamp?.toDate() || new Date();
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${data.fullName || data.name || 'N/A'}</td>
                <td>${data.email || 'N/A'}</td>
                <td>${data.phoneNumber || data.phone || 'N/A'}</td>
                <td>${data.interests || 'N/A'}</td>
                <td>${formatDate(date)}</td>
            `;
            
            registrationsTable.appendChild(row);
        });

        // Process users collection
        users.forEach(doc => {
            hasData = true;
            const data = doc.data();
            const date = data.timestamp?.toDate() || new Date();
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${data.fullName || data.name || 'N/A'}</td>
                <td>${data.email || 'N/A'}</td>
                <td>${data.phoneNumber || data.phone || 'N/A'}</td>
                <td>${data.interests || 'N/A'}</td>
                <td>${formatDate(date)}</td>
            `;
            
            registrationsTable.appendChild(row);
        });

        if (!hasData) {
            registrationsTable.innerHTML = '<tr><td colspan="5" style="text-align: center;">No registrations found</td></tr>';
        }
    });
}

// Load RSVPs data
function loadRSVPs() {
    const rsvpsTable = document.querySelector('#rsvps-table tbody');
    
    db.collection('rsvps').orderBy('timestamp', 'desc').get().then(snapshot => {
        console.log(`Found ${snapshot.size} RSVPs`);
        rsvpsTable.innerHTML = '';
        
        if (snapshot.empty) {
            rsvpsTable.innerHTML = '<tr><td colspan="5" style="text-align: center;">No RSVPs found</td></tr>';
            return;
        }
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.timestamp?.toDate() || new Date();
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${data.eventTitle || 'Event'}</td>
                <td>${data.attendeeName || 'Guest'}</td>
                <td>${data.attendeeEmail || 'N/A'}</td>
                <td>${data.numberOfGuests || data.guests || 0}</td>
                <td>${formatDate(date)}</td>
            `;
            
            rsvpsTable.appendChild(row);
        });
    }).catch(error => {
        console.error('Error loading RSVPs:', error);
        rsvpsTable.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">Error loading RSVPs: ${error.message}</td></tr>`;
    });
}

// Load messages data - FIXED: Now checks multiple possible collections
function loadMessages() {
    const messagesTable = document.querySelector('#messages-table tbody');
    
    // Try ALL possible collection names for messages
    Promise.all([
        db.collection('contact_messages').orderBy('timestamp', 'desc').get().catch(() => ({ forEach: () => {} })),
        db.collection('contactSubmissions').orderBy('timestamp', 'desc').get().catch(() => ({ forEach: () => {} })),
        db.collection('contacts').orderBy('timestamp', 'desc').get().catch(() => ({ forEach: () => {} })),
        db.collection('messages').orderBy('timestamp', 'desc').get().catch(() => ({ forEach: () => {} }))
    ]).then(([contactMessages, contactSubmissions, contacts, messages]) => {
        messagesTable.innerHTML = '';
        
        let hasData = false;

        // Process contact_messages collection
        contactMessages.forEach(doc => {
            hasData = true;
            const data = doc.data();
            const date = data.timestamp?.toDate() || new Date();
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${data.name || data.fullName || 'Unknown'}</td>
                <td>${data.email || 'N/A'}</td>
                <td>${data.subject || 'No Subject'}</td>
                <td>${truncateText(data.message || data.content || 'No message', 50)}</td>
                <td>${formatDate(date)}</td>
                <td>
                    <button class="btn-view-message" data-id="${doc.id}" data-collection="contact_messages">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            `;
            
            messagesTable.appendChild(row);
        });

        // Process contactSubmissions collection
        contactSubmissions.forEach(doc => {
            hasData = true;
            const data = doc.data();
            const date = data.timestamp?.toDate() || new Date();
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${data.name || data.fullName || 'Unknown'}</td>
                <td>${data.email || 'N/A'}</td>
                <td>${data.subject || 'No Subject'}</td>
                <td>${truncateText(data.message || data.content || 'No message', 50)}</td>
                <td>${formatDate(date)}</td>
                <td>
                    <button class="btn-view-message" data-id="${doc.id}" data-collection="contactSubmissions">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            `;
            
            messagesTable.appendChild(row);
        });

        // Process contacts collection
        contacts.forEach(doc => {
            hasData = true;
            const data = doc.data();
            const date = data.timestamp?.toDate() || new Date();
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${data.name || data.fullName || 'Unknown'}</td>
                <td>${data.email || 'N/A'}</td>
                <td>${data.subject || 'No Subject'}</td>
                <td>${truncateText(data.message || data.content || 'No message', 50)}</td>
                <td>${formatDate(date)}</td>
                <td>
                    <button class="btn-view-message" data-id="${doc.id}" data-collection="contacts">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            `;
            
            messagesTable.appendChild(row);
        });

        // Process messages collection
        messages.forEach(doc => {
            hasData = true;
            const data = doc.data();
            const date = data.timestamp?.toDate() || new Date();
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${data.name || data.fullName || 'Unknown'}</td>
                <td>${data.email || 'N/A'}</td>
                <td>${data.subject || 'No Subject'}</td>
                <td>${truncateText(data.message || data.content || 'No message', 50)}</td>
                <td>${formatDate(date)}</td>
                <td>
                    <button class="btn-view-message" data-id="${doc.id}" data-collection="messages">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            `;
            
            messagesTable.appendChild(row);
        });

        if (!hasData) {
            messagesTable.innerHTML = '<tr><td colspan="6" style="text-align: center;">No messages found in any collection</td></tr>';
        }
        
        // Set up message view buttons
        document.querySelectorAll('.btn-view-message').forEach(button => {
            button.addEventListener('click', () => {
                const messageId = button.getAttribute('data-id');
                const collection = button.getAttribute('data-collection');
                viewMessage(messageId, collection);
            });
        });
    });
}

// View full message
function viewMessage(messageId, collection = 'contact_messages') {
    db.collection(collection).doc(messageId).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            const date = data.timestamp?.toDate() || new Date();
            
            alert(`Message from ${data.name || data.fullName || 'Unknown'} (${data.email})\n\nSubject: ${data.subject || 'No Subject'}\n\nMessage: ${data.message || data.content || 'No message'}\n\nReceived: ${formatDate(date)}`);
        }
    }).catch(error => {
        alert('Error loading message: ' + error.message);
    });
}

// Load donations data - FIXED TIMESTAMP ISSUE
function loadDonations() {
    const donationsTable = document.querySelector('#donations-table tbody');
    
    db.collection('donations').orderBy('timestamp', 'desc').get().then(snapshot => {
        console.log(`Found ${snapshot.size} donations`);
        donationsTable.innerHTML = '';
        
        let total = 0;
        let oneTimeTotal = 0;
        let monthlyTotal = 0;
        
        if (snapshot.empty) {
            donationsTable.innerHTML = '<tr><td colspan="6" style="text-align: center;">No donations found</td></tr>';
            
            // Update summary with zeros
            document.getElementById('total-donations').textContent = 'R0.00';
            document.getElementById('one-time-donations').textContent = 'R0.00';
            document.getElementById('monthly-donations').textContent = 'R0.00';
            return;
        }
        
        snapshot.forEach(doc => {
            const data = doc.data();
            
            // FIX: Handle different timestamp formats safely
            const date = parseTimestamp(data.timestamp);
            const amount = parseFloat(data.amount) || 0;
            
            total += amount;
            
            if (data.isRecurring) {
                monthlyTotal += amount;
            } else {
                oneTimeTotal += amount;
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${data.donorName || data.name || 'Anonymous'}</td>
                <td>R${amount.toFixed(2)}</td>
                <td>${data.isRecurring ? 'Monthly' : 'One-Time'}</td>
                <td>${data.paymentMethod || 'Unknown'}</td>
                <td>${formatDate(date)}</td>
                <td>${data.visibility === 'public' ? 'Public' : 'Anonymous'}</td>
            `;
            
            donationsTable.appendChild(row);
        });
        
        // Update summary
        document.getElementById('total-donations').textContent = 'R' + total.toFixed(2);
        document.getElementById('one-time-donations').textContent = 'R' + oneTimeTotal.toFixed(2);
        document.getElementById('monthly-donations').textContent = 'R' + monthlyTotal.toFixed(2);
    }).catch(error => {
        console.error('Error loading donations:', error);
        donationsTable.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Error loading donations: ${error.message}</td></tr>`;
    });
}

// Helper function to parse timestamp safely
function parseTimestamp(timestamp) {
    if (!timestamp) {
        return new Date();
    }
    
    // If it's a Firestore Timestamp object
    if (typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
    }
    
    // If it's a timestamp with seconds/nanoseconds
    if (timestamp.seconds !== undefined) {
        return new Date(timestamp.seconds * 1000);
    }
    
    // If it's a string date
    if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        return isNaN(date.getTime()) ? new Date() : date;
    }
    
    // If it's a number (milliseconds)
    if (typeof timestamp === 'number') {
        return new Date(timestamp);
    }
    
    // Fallback to current date
    return new Date();
}

// Load events data
function loadEvents() {
    const eventsList = document.getElementById('events-list');
    
    db.collection('events').orderBy('date').get().then(snapshot => {
        console.log(`Found ${snapshot.size} events`);
        eventsList.innerHTML = '';
        
        if (snapshot.empty) {
            eventsList.innerHTML = '<div class="no-events">No events found. Click "Add Event" to create your first event.</div>';
            return;
        }
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const eventDate = data.date?.toDate() || new Date();
            const eventTime = data.time || '00:00';
            
            const eventCard = document.createElement('div');
            eventCard.className = 'event-card';
            eventCard.innerHTML = `
                <div class="event-header">
                    <div class="event-date">
                        <span class="day">${eventDate.getDate()}</span>
                        <span class="month">${eventDate.toLocaleString('default', { month: 'short' })}</span>
                    </div>
                    <div class="event-badge">${capitalizeFirstLetter(data.category || 'general')}</div>
                </div>
                <h3 class="event-title">${data.title || 'Untitled Event'}</h3>
                <div class="event-meta">
                    <span><i class="far fa-clock"></i> ${formatTime(eventTime)}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${data.location || 'TBA'}</span>
                </div>
                <p class="event-description">${data.description || 'No description provided.'}</p>
                <div class="event-actions">
                    <button class="btn-secondary btn-edit-event" data-id="${doc.id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-danger btn-delete-event" data-id="${doc.id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            `;
            
            eventsList.appendChild(eventCard);
        });
        
        // Set up edit buttons
        document.querySelectorAll('.btn-edit-event').forEach(button => {
            button.addEventListener('click', () => {
                const eventId = button.getAttribute('data-id');
                editEvent(eventId);
            });
        });
        
        // Set up delete buttons
        document.querySelectorAll('.btn-delete-event').forEach(button => {
            button.addEventListener('click', () => {
                const eventId = button.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this event?')) {
                    deleteEvent(eventId);
                }
            });
        });
    }).catch(error => {
        console.error('Error loading events:', error);
        eventsList.innerHTML = `<div class="error-message">Error loading events: ${error.message}</div>`;
    });
}

// Set up event modal
function setupEventModal() {
    const modal = document.getElementById('event-modal');
    const addEventBtn = document.getElementById('add-event-btn');
    const cancelEventBtn = document.getElementById('cancel-event');
    const eventForm = document.getElementById('event-form');
    
    // Open modal for adding new event
    addEventBtn.addEventListener('click', () => {
        document.getElementById('modal-title').textContent = 'Add New Event';
        document.getElementById('event-id').value = '';
        eventForm.reset();
        modal.classList.add('active');
    });
    
    // Close modal
    cancelEventBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });
    
    document.querySelector('.close-modal').addEventListener('click', () => {
        modal.classList.remove('active');
    });
    
    // Handle form submission
    eventForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const eventId = document.getElementById('event-id').value;
        const title = document.getElementById('event-title').value;
        const date = document.getElementById('event-date').value;
        const time = document.getElementById('event-time').value;
        const location = document.getElementById('event-location').value;
        const category = document.getElementById('event-category').value;
        const description = document.getElementById('event-description').value;
        
        // SOLUTION: Create event data in the exact format expected by main website
        const eventData = {
            title: title,
            date: firebase.firestore.Timestamp.fromDate(new Date(date)),
            time: time,
            location: location,
            category: category,
            description: description,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            // Add fields that might be expected by main website
            eventDate: firebase.firestore.Timestamp.fromDate(new Date(date)),
            eventTime: time,
            eventLocation: location,
            eventDescription: description,
            eventType: category
        };
        
        if (eventId) {
            // Update existing event
            db.collection('events').doc(eventId).update(eventData)
                .then(() => {
                    alert('Event updated successfully!');
                    modal.classList.remove('active');
                    loadEvents();
                })
                .catch(error => {
                    alert('Error updating event: ' + error.message);
                });
        } else {
            // Add new event
            db.collection('events').add(eventData)
                .then(() => {
                    alert('Event added successfully!');
                    modal.classList.remove('active');
                    loadEvents();
                })
                .catch(error => {
                    alert('Error adding event: ' + error.message);
                });
        }
    });
}

// Edit event
function editEvent(eventId) {
    db.collection('events').doc(eventId).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            const eventDate = data.date.toDate();
            
            // Format date as YYYY-MM-DD
            const formattedDate = eventDate.toISOString().split('T')[0];
            
            document.getElementById('modal-title').textContent = 'Edit Event';
            document.getElementById('event-id').value = doc.id;
            document.getElementById('event-title').value = data.title;
            document.getElementById('event-date').value = formattedDate;
            document.getElementById('event-time').value = data.time || '';
            document.getElementById('event-location').value = data.location;
            document.getElementById('event-category').value = data.category;
            document.getElementById('event-description').value = data.description;
            
            document.getElementById('event-modal').classList.add('active');
        }
    }).catch(error => {
        alert('Error loading event: ' + error.message);
    });
}

// Delete event
function deleteEvent(eventId) {
    db.collection('events').doc(eventId).delete()
        .then(() => {
            alert('Event deleted successfully!');
            loadEvents();
        })
        .catch(error => {
            alert('Error deleting event: ' + error.message);
        });
}

// Helper function to format date
function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Helper function to format time
function formatTime(timeString) {
    if (!timeString) return '';
    
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    return `${hour12}:${minutes} ${ampm}`;
}

// Helper function to truncate text
function truncateText(text, maxLength) {
    if (!text) return 'No content';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
    if (!string) return 'General';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Set up export buttons
document.getElementById('export-registrations').addEventListener('click', () => {
    exportToCSV('registrations', 'MPGM_Registrations.csv');
});

document.getElementById('export-rsvps').addEventListener('click', () => {
    exportToCSV('rsvps', 'MPGM_RSVPs.csv');
});

document.getElementById('export-messages').addEventListener('click', () => {
    // Try all collections for messages
    exportToCSV('contact_messages', 'MPGM_Messages.csv');
});

document.getElementById('export-donations').addEventListener('click', () => {
    exportToCSV('donations', 'MPGM_Donations.csv');
});

// Export data to CSV
function exportToCSV(collectionName, fileName) {
    db.collection(collectionName).get().then(snapshot => {
        if (snapshot.empty) {
            alert('No data to export from ' + collectionName);
            return;
        }
        
        let csv = '';
        const headers = [];
        const rows = [];
        
        // Process each document
        snapshot.forEach(doc => {
            const data = doc.data();
            const row = [];
            
            // Add all fields to CSV
            for (const [key, value] of Object.entries(data)) {
                // Skip Firestore-specific fields
                if (key === 'timestamp' || key === 'createdAt') continue;
                
                // Add header if not already added
                if (headers.indexOf(key) === -1) {
                    headers.push(key);
                }
                
                // Format the value
                let formattedValue = value;
                
                if (value instanceof firebase.firestore.Timestamp) {
                    formattedValue = formatDate(value.toDate());
                } else if (typeof value === 'object') {
                    formattedValue = JSON.stringify(value);
                } else if (typeof value === 'boolean') {
                    formattedValue = value ? 'Yes' : 'No';
                } else if (value === null || value === undefined) {
                    formattedValue = '';
                }
                
                row[headers.indexOf(key)] = `"${String(formattedValue).replace(/"/g, '""')}"`;
            }
            
            rows.push(row.join(','));
        });
        
        // Create CSV content
        csv = headers.join(',') + '\n' + rows.join('\n');
        
        // Create download link
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }).catch(error => {
        alert('Error exporting data: ' + error.message);
    });
}