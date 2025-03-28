<template>
  <div class="app">
    <header>
      <div class="current-time">On est le {{ currentDateTime }}</div>
    </header>
    <main>
      <div class="layout">
        <!-- Formulaire à gauche -->
        <div class="form-container">
          <h2>
            {{
              isEditing ? 'Modifier la réservation' : 'Créer une réservation'
            }}
          </h2>
          <form
            @submit.prevent="
              isEditing ? updateReservation() : addToUnscheduled()
            "
            :disabled="isSunday(newReservation.date)"
          >
            <div class="form-group">
              <label>Titre</label>
              <input
                type="text"
                v-model="newReservation.title"
                placeholder="Nom de la réservation"
                required
              />
            </div>

            <div class="form-group">
              <label>Date</label>
              <VueDatePicker
                v-model="newReservation.date"
                :enable-time-picker="false"
                auto-apply
                locale="fr"
                :min-date="new Date()"
                format="dd/MM/yyyy"
                placeholder="Sélectionner une date"
                required
              />
            </div>

            <div v-if="isSunday(newReservation.date)" class="alert">
              Les réservations ne sont pas possibles le dimanche.
            </div>

            <div class="form-group">
              <label>Heure de début</label>
              <select v-model="newReservation.start" required>
                <option
                  v-for="hour in availableHours"
                  :key="hour"
                  :value="hour"
                >
                  {{ hour }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>Heure de fin</label>
              <select v-model="newReservation.end" required>
                <option
                  v-for="hour in availableHours"
                  :key="hour"
                  :value="hour"
                >
                  {{ hour }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>Description</label>
              <textarea
                v-model="newReservation.description"
                placeholder="Description optionnelle"
              ></textarea>
            </div>

            <div class="form-group">
              <label>Salle</label>
              <select v-model="newReservation.roomId" required>
                <option value="">Sélectionner une salle</option>
                <option v-for="room in rooms" :key="room.id" :value="room.id">
                  {{ room.name }} ({{ room.capacity }} pers.)
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>Email</label>
              <input
                type="email"
                v-model="newReservation.email"
                placeholder="Votre adresse mail"
              />
            </div>

            <div class="form-actions">
              <button type="submit" class="btn-submit">
                {{ isEditing ? 'Sauvegarder' : 'Ajouter aux événements' }}
              </button>
              <button
                v-if="isEditing"
                type="button"
                class="btn-delete"
                @click="deleteReservation"
              >
                Supprimer
              </button>
              <button
                v-if="isEditing"
                type="button"
                class="btn-cancel"
                @click="cancelEdit"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>

        <!-- Calendrier à droite -->
        <div class="calendar-section">
          <div class="calendar-navigation">
            <button @click="previousWeek" class="nav-btn">←</button>
            <div class="week-selector" @click="showDatePicker = true">
              <span
                >Semaine du {{ formatDate(weekStart) }} au
                {{ formatDate(weekEnd) }}</span
              >
              <VueDatePicker
                v-if="showDatePicker"
                v-model="selectedDate"
                @update:model-value="onDateSelect"
                :enable-time-picker="false"
                auto-apply
                week-start="1"
                locale="fr"
                position="bottom"
                :teleport="true"
                :auto-position="false"
              />
            </div>
            <button @click="nextWeek" class="nav-btn">→</button>
          </div>

          <div class="week-view">
            <div class="weekdays-header">
              <div class="nothing"></div>
              <div
                v-for="(day, index) in weekDays"
                :key="index"
                class="weekday"
              >
                {{ day }}
              </div>
            </div>
            <div class="calendar-grid">
              <div class="hour-column-header">
                <div class="hours-column">
                  <div class="hours-nothing"></div>
                  <div v-for="slot in hours" :key="slot" class="hour-label">
                    {{ slot }}
                  </div>
                </div>
              </div>
              <!-- Grille des jours et événements -->
              <div class="days-grid">
                <div
                  v-for="date in dates"
                  :key="date.toISOString()"
                  class="day-column"
                >
                  <div class="date-number">{{ date.getDate() }}</div>
                  <div
                    v-for="slot in hours"
                    :key="slot"
                    class="room-day-cell"
                    :class="{ 'current-day': isToday(date) }"
                    @dragover.prevent
                    @drop="onDrop($event, date, slot)"
                  >
                    <div class="events-container">
                      <div
                        v-for="event in getEventsForDateAndSlot(date, slot)"
                        :key="event.id"
                        class="calendar-event"
                        :class="{
                          'pending-approval': event.status === 'pending',
                        }"
                        draggable="true"
                        @dragstart="onDragStart($event, event)"
                        @click="editEvent(event)"
                      >
                        <div class="event-room">
                          {{ getRoomName(event.roomId) }}
                        </div>
                        <div class="event-title">{{ event.title }}</div>
                        <div
                          class="event-status"
                          v-if="event.status === 'pending'"
                        >
                          En attente
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
    <button @click="exportCalendar" class="btn-export">
      Exporter le calendrier
    </button>

    <!-- Modal d'édition -->
    <div v-if="isEditing" class="edit-modal">
      <div class="modal-content">
        <h2>Modifier la réservation</h2>

        <div class="form-group">
          <label>Titre</label>
          <input v-model="newReservation.title" type="text" required />
        </div>

        <div class="form-group">
          <label>Date</label>
          <input
            v-model="newReservation.date"
            type="date"
            required
            :disabled="true"
          />
        </div>

        <div class="form-group">
          <label>Début</label>
          <input v-model="newReservation.start" type="time" required />
        </div>

        <div class="form-group">
          <label>Fin</label>
          <input v-model="newReservation.end" type="time" required />
        </div>

        <div class="form-group">
          <label>Salle</label>
          <select v-model="newReservation.roomId" required>
            <option v-for="room in rooms" :key="room.id" :value="room.id">
              {{ room.name }}
            </option>
          </select>
        </div>

        <div class="modal-actions">
          <button @click="updateReservation" class="btn-submit">
            Mettre à jour
          </button>
          <button @click="cancelEdit" class="btn-cancel">Annuler</button>
          <button @click="deleteReservation" class="btn-delete">
            Supprimer
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoomStore } from '../store'
import { storeToRefs } from 'pinia'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import axios from 'axios'
import { sendEmail } from '../services/emailService'

const store = useRoomStore()
const { rooms, reservations, isRoomAvailable } = storeToRefs(store)
const unscheduledEvents = ref([])
const draggedEvent = ref(null)

const isEditing = ref(false)
const editingEventId = ref(null)
const newReservation = ref({
  title: '',
  date: new Date(),
  start: '08:00',
  end: '10:00',
  description: '',
  roomId: '',
  email: '',
})

const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const weekStart = ref(getStartOfWeek(new Date()))
const weekEnd = ref(getEndOfWeek(weekStart.value))

const dates = computed(() => {
  const dates = []
  const current = new Date(weekStart.value)
  current.setHours(0, 0, 0, 0) // Réinitialiser les heures à minuit

  for (let i = 0; i < 7; i++) {
    const newDate = new Date(current)
    dates.push(newDate)
    current.setDate(current.getDate() + 1)
  }

  return dates
})

const hours = ['08:00', '10:00', '12:00', '14:00', '16:00']

const availableHours = ['08:00', '10:00', '12:00', '14:00', '16:00']

function getStartOfWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0) // Réinitialiser les heures à minuit
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d
}

function getEndOfWeek(startDate) {
  const d = new Date(startDate)
  d.setDate(d.getDate() + 6)
  return new Date(d)
}

function formatDate(date) {
  if (!date) return ''
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return ''

    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
    }).format(d)
  } catch (error) {
    console.error('Erreur de formatage de date:', error)
    return ''
  }
}

function formatDateRange(startDate, endDate) {
  return `${formatDate(startDate)} - ${formatDate(endDate)}`
}

function previousWeek() {
  const currentStart = new Date(weekStart.value)
  currentStart.setDate(currentStart.getDate() - 7)
  weekStart.value = currentStart
  weekEnd.value = new Date(currentStart)
  weekEnd.value.setDate(weekEnd.value.getDate() + 6)
}

function nextWeek() {
  const newStart = new Date(weekStart.value)
  newStart.setDate(newStart.getDate() + 7)
  weekStart.value = newStart
  weekEnd.value = getEndOfWeek(newStart)
}

function isToday(date) {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

function selectDate(date) {
  console.log('Date sélectionnée:', date)
}

function isSlotAvailable(date, start, roomId) {
  const end = `${parseInt(start.split(':')[0]) + 2}:00`
  return store.isRoomAvailable(roomId, date, start, end)
}

function resetForm() {
  newReservation.value = {
    title: '',
    date: new Date(),
    start: '08:00',
    end: '10:00',
    description: '',
    roomId: '',
    email: '',
  }
  isEditing.value = false
  editingEventId.value = null
}

function addToUnscheduled() {
  try {
    // Vérifiez que tous les champs requis sont remplis
    if (
      !newReservation.value.title ||
      !newReservation.value.date ||
      !newReservation.value.start ||
      !newReservation.value.end ||
      !newReservation.value.roomId
    ) {
      alert('Veuillez remplir tous les champs requis')
      return
    }

    // Formater la date correctement si c'est un objet Date
    let dateStr = newReservation.value.date
    if (dateStr instanceof Date) {
      const year = dateStr.getFullYear()
      const month = String(dateStr.getMonth() + 1).padStart(2, '0')
      const day = String(dateStr.getDate()).padStart(2, '0')
      dateStr = `${year}-${month}-${day}`
    }

    const reservationToAdd = {
      ...newReservation.value,
      date: dateStr,
    }

    // Appeler la fonction pour créer une nouvelle réservation
    store
      .addReservation(reservationToAdd)
      .then(() => {
        console.log('Réservation ajoutée avec succès')

        // Envoyer un email de confirmation si une adresse email est fournie
        if (newReservation.value.email) {
          sendConfirmationEmail(reservationToAdd)
        }

        resetForm() // Réinitialiser le formulaire après l'ajout
      })
      .catch((error) => {
        console.error("Erreur lors de l'ajout de la réservation:", error)
        alert("Erreur lors de l'ajout de la réservation")
      })
  } catch (error) {
    console.error("Erreur lors de l'ajout de la réservation:", error)
  }
}

function removeUnscheduledEvent(id) {
  const index = unscheduledEvents.value.findIndex((e) => e.id === id)
  if (index !== -1) {
    unscheduledEvents.value.splice(index, 1)
    // Supprimer également du store
    store.deleteReservation(id)
  }
}

function onDragStart(event, reservation) {
  draggedEvent.value = reservation
  event.dataTransfer.effectAllowed = 'move'
}

function getRoomName(roomId) {
  const room = rooms.value.find((r) => r.id === roomId)
  return room ? room.name : 'Salle inconnue'
}

function onDragOver(event) {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
}

function onDrop(event, date, slot) {
  event.preventDefault()
  if (!draggedEvent.value) return

  // Créer une date sans décalage de fuseau horaire
  const newDate = new Date(date)
  newDate.setHours(0, 0, 0, 0) // Réinitialiser les heures à minuit

  // Formater la date au format YYYY-MM-DD sans décalage de fuseau horaire
  const year = newDate.getFullYear()
  const month = String(newDate.getMonth() + 1).padStart(2, '0')
  const day = String(newDate.getDate()).padStart(2, '0')
  const formattedDate = `${year}-${month}-${day}`

  // Calculer l'heure de fin (2 heures après l'heure de début)
  const startHour = parseInt(slot.split(':')[0])
  const endHour = startHour + 2
  const endTime = `${endHour.toString().padStart(2, '0')}:00`

  const updatedEvent = {
    ...draggedEvent.value,
    date: formattedDate,
    start: slot,
    end: endTime,
  }

  // Mettre à jour la réservation
  store
    .updateReservation(draggedEvent.value.id, updatedEvent)
    .then(() => {
      // Afficher une alerte de confirmation
      alert(
        `La réservation "${updatedEvent.title}" a été déplacée au ${new Date(
          formattedDate
        ).toLocaleDateString('fr-FR')} à ${slot}.
        ${
          updatedEvent.email
            ? `Un email de confirmation a été envoyé à ${updatedEvent.email}.`
            : "Aucun email n'est associé à cette réservation."
        }`
      )

      // Envoyer un email de confirmation si l'email est disponible
      if (updatedEvent.email) {
        sendConfirmationEmail({
          ...updatedEvent,
          title: `${updatedEvent.title} (Modification)`,
          description: `${
            updatedEvent.description || ''
          }\n\nCette réservation a été modifiée par glisser-déposer dans le calendrier.`,
        })
      }

      // Réinitialiser l'événement glissé
      draggedEvent.value = null
    })
    .catch((error) => {
      console.error('Erreur lors de la mise à jour par glisser-déposer:', error)
      alert('Une erreur est survenue lors du déplacement de la réservation.')
      draggedEvent.value = null
    })
}

function getEventsForDate(date) {
  if (!date) return []
  const events = store.reservations.filter((event) => {
    // Créer des dates sans les composants de temps pour une comparaison correcte
    const eventDate = new Date(event.date)
    eventDate.setHours(0, 0, 0, 0)

    const compareDate = new Date(date)
    compareDate.setHours(0, 0, 0, 0)

    return eventDate.getTime() === compareDate.getTime()
  })
  console.log('Events for date:', date, events)
  return events
}

function getEventsForDateAndSlot(date, slot) {
  const events = getEventsForDate(date).filter((event) => event.start === slot)
  console.log('Events for date and slot:', date, slot, events)
  return events
}

const showDatePicker = ref(false)
const selectedDate = ref(new Date())

function onDateSelect(date) {
  if (!date) return

  try {
    const selectedDate = new Date(date)

    const day = selectedDate.getDay()
    const diff = selectedDate.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(selectedDate.setDate(diff))

    weekStart.value = new Date(monday)
    weekEnd.value = new Date(monday.setDate(monday.getDate() + 6))

    showDatePicker.value = false
  } catch (error) {
    console.error('Erreur lors de la sélection de date:', error)
  }
}

async function editEvent(event) {
  try {
    isEditing.value = true
    editingEventId.value = event.id

    // Pré-remplir le formulaire avec les informations de l'événement
    newReservation.value = {
      ...event,
      date: new Date(event.date).toLocaleDateString('fr-CA'), // Utiliser toLocaleDateString pour éviter les problèmes de fuseau horaire
      start: event.start,
      end: event.end,
      roomId: event.roomId.toString(), // Convertir en chaîne si nécessaire
      title: event.title,
      description: event.description || '', // Assurez-vous que la description est incluse
      email: event.email || '', // Assurez-vous que l'email est inclus
    }

    console.log('Édition de la réservation:', newReservation.value)
  } catch (error) {
    console.error("Erreur lors de l'édition:", error)
  }
}

async function updateReservation() {
  try {
    if (!newReservation.value.title || !newReservation.value.roomId) {
      alert('Veuillez remplir tous les champs requis')
      return
    }

    // Vérifier la disponibilité de la salle
    if (
      !isSlotAvailable(
        newReservation.value.date,
        newReservation.value.start,
        newReservation.value.roomId
      )
    ) {
      alert('Cette salle est déjà réservée pour ce créneau.')
      return
    }

    // Assurez-vous que la date est correctement formatée (YYYY-MM-DD)
    let dateStr = newReservation.value.date
    if (dateStr instanceof Date) {
      const year = dateStr.getFullYear()
      const month = String(dateStr.getMonth() + 1).padStart(2, '0')
      const day = String(dateStr.getDate()).padStart(2, '0')
      dateStr = `${year}-${month}-${day}`
    }

    const updatedReservation = {
      ...newReservation.value,
      id: editingEventId.value,
      date: dateStr,
      roomId: parseInt(newReservation.value.roomId), // Convertir en nombre si nécessaire
    }

    console.log('Mise à jour de la réservation:', updatedReservation)

    await store.updateReservation(editingEventId.value, updatedReservation)

    // Envoyer un email de confirmation si une adresse email est fournie
    if (newReservation.value.email) {
      sendConfirmationEmail(updatedReservation)
    }

    await store.fetchReservations()

    resetForm()
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error)
    alert('Erreur lors de la mise à jour de la réservation')
  }
}

function deleteReservation() {
  if (confirm('Êtes-vous sûr de vouloir supprimer cette réservation ?')) {
    // Supprimer du store
    store.deleteReservation(editingEventId.value)

    // Supprimer aussi de la liste des événements non planifiés
    const index = unscheduledEvents.value.findIndex(
      (e) => e.id === editingEventId.value
    )
    if (index !== -1) {
      unscheduledEvents.value.splice(index, 1)
    }

    cancelEdit()
  }
}

function cancelEdit() {
  isEditing.value = false
  editingEventId.value = null
  resetForm()
}

const currentDateTime = ref(
  new Date().toLocaleString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Europe/Paris',
  })
)

setInterval(() => {
  currentDateTime.value = new Date().toLocaleString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Europe/Paris',
  })
}, 1000)

function exportCalendar() {
  const events = store.reservations
  let icsContent =
    'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Your Company//Your Product//EN\n'

  events.forEach((event) => {
    // Créer une date en préservant le jour exact (sans décalage de fuseau horaire)
    const eventDate = event.date.split('-')
    const year = eventDate[0]
    const month = eventDate[1]
    const day = eventDate[2]

    icsContent += 'BEGIN:VEVENT\n'
    icsContent += `UID:${event.id}@yourdomain.com\n`
    icsContent += `DTSTAMP:${
      new Date().toISOString().replace(/[-:]/g, '').split('.')[0]
    }Z\n`
    icsContent += `DTSTART:${year}${month}${day}T${event.start.replace(
      ':',
      ''
    )}00\n`
    icsContent += `DTEND:${year}${month}${day}T${event.end.replace(
      ':',
      ''
    )}00\n`
    icsContent += `SUMMARY:${event.title}\n`
    icsContent += `DESCRIPTION:${event.description}\n`
    icsContent += 'END:VEVENT\n'
  })

  icsContent += 'END:VCALENDAR'

  const blob = new Blob([icsContent], { type: 'text/calendar' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'calendar.ics'
  link.click()
}

function updateDates() {
  // Logique pour mettre à jour les dates affichées
}

function adjustEndTime() {
  const startHour = parseInt(newReservation.value.start.split(':')[0])
  const endHour = startHour + 2
  newReservation.value.end = `${endHour.toString().padStart(2, '0')}:00`
}

// Surveillez les changements de l'heure de début pour ajuster l'heure de fin
watch(() => newReservation.value.start, adjustEndTime)

function isSunday(date) {
  const selectedDate = new Date(date)
  return selectedDate.getDay() === 0 // 0 correspond à dimanche
}

onMounted(async () => {
  try {
    console.log("Initialisation de l'application")
    await store.fetchRooms()
    await store.fetchReservations()
    store.startPolling() // Démarrer le polling
    console.log('Polling démarré')
  } catch (error) {
    console.error("Erreur lors de l'initialisation:", error)
  }
})

onUnmounted(() => {
  console.log("Nettoyage de l'application")
  store.stopPolling() // Arrêter le polling
})

// Fonction pour envoyer un email de confirmation
async function sendConfirmationEmail(reservation) {
  try {
    if (!reservation.email) return // Ne pas envoyer si pas d'email

    const roomName = getRoomName(reservation.roomId)
    const formattedDate = new Date(reservation.date).toLocaleDateString('fr-FR')

    // Préparer les données pour l'API d'envoi d'email
    const emailData = {
      to: reservation.email,
      subject: `Confirmation de réservation: ${reservation.title}`,
      body: `
        <h2>Confirmation de votre réservation</h2>
        <p>Bonjour,</p>
        <p>Votre réservation a été confirmée avec les détails suivants:</p>
        <ul>
          <li><strong>Titre:</strong> ${reservation.title}</li>
          <li><strong>Date:</strong> ${formattedDate}</li>
          <li><strong>Horaire:</strong> ${reservation.start} - ${
        reservation.end
      }</li>
          <li><strong>Salle:</strong> ${roomName}</li>
          <li><strong>Description:</strong> ${
            reservation.description || 'Aucune description'
          }</li>
        </ul>
        <p>Merci d'utiliser notre système de réservation de salles.</p>
      `,
    }

    // Appel au service d'envoi d'email
    try {
      await sendEmail(emailData)
      console.log('Email de confirmation envoyé à:', reservation.email)
      alert(`Un email de confirmation a été envoyé à ${reservation.email}`)
    } catch (apiError) {
      console.error("Erreur lors de l'envoi de l'email:", apiError)
      alert(`Erreur lors de l'envoi de l'email: ${apiError.message}`)
    }
  } catch (error) {
    console.error("Erreur lors de la préparation de l'email:", error)
  }
}
</script>

<style scoped>
.app {
  font-family: 'Roboto', sans-serif;
}

.btn-submit,
.btn-add {
  background-color: #42b983; /* Vert par défaut */
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-submit:hover,
.btn-add:hover {
  background-color: #369f6b; /* Vert foncé */
}

.btn-submit:active {
  background-color: #2e8b57; /* Vert encore plus foncé */
}

/* Autres styles existants */
.calendar-event {
  background-color: #42b983; /* Vert par défaut */
  color: #3aa876;
  padding: 0.75rem;
  border-radius: var(--radius);
  margin: 0.5rem 0;
  font-size: 0.9rem;
  box-shadow: var(--shadow);
  transition: var(--transition);
  cursor: pointer;
}

.calendar-event:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.calendar-event:active {
  background-color: #2e8b57; /* Vert encore plus foncé */
}

.room-day-cell:hover {
  background-color: #f8f9fa;
}

/* Variables de couleurs et thème */
:root {
  --primary-color: #2c3e50;
  --secondary-color: #42b983;
  --danger-color: #e74c3c;
  --warning-color: #f39c12;
  --gray-light: #f8f9fa;
  --gray-medium: #e9ecef;
  --gray-dark: #495057;
  --shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  --radius: 8px;
  --transition: all 0.3s ease;
}

/* Style Modal */
.edit-modal {
  background-color: white;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.modal-content {
  background-color: white;
  padding: 2rem;
  border-radius: var(--radius);
  min-width: 400px;
  max-width: 600px;
  width: 90%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-content h2 {
  color: var(--primary-color);
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
  border-bottom: 2px solid var(--gray-medium);
  padding-bottom: 0.75rem;
}

/* Formulaires */
.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--primary-color);
  font-weight: 500;
  font-size: 0.95rem;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--gray-medium);
  border-radius: var(--radius);
  font-size: 1rem;
  transition: var(--transition);
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--secondary-color);
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.1);
}

/* Boutons */
.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  justify-content: flex-end;
}

button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--radius);
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
  font-size: 0.95rem;
}

.btn-submit {
  background-color: #42b983;
}

.btn-submit:hover {
  background-color: #3aa876;
  transform: translateY(-1px);
}

.btn-cancel {
  background-color: var(--gray-medium);
  color: var(--gray-dark);
}

.btn-cancel:hover {
  background-color: #c0392b;
  color: white;
}

.btn-delete {
  background-color: #c0392b;
  color: white;
}

.btn-delete:hover {
  background-color: #c0392b;
}

/* Calendrier et événements */
.calendar-event {
  background-color: #42b983;
  color: white;
  padding: 0.75rem;
  border-radius: var(--radius);
  margin: 0.5rem 0;
  font-size: 0.9rem;
  box-shadow: var(--shadow);
  transition: var(--transition);
  cursor: pointer;
}

.calendar-event:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.calendar-event.pending-approval {
  background-color: var(--warning-color);
  border: 2px dashed rgba(255, 255, 255, 0.5);
}

.event-time {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.event-title {
  font-size: 0.95rem;
}

.event-status {
  font-size: 0.8rem;
  opacity: 0.9;
  margin-top: 0.5rem;
  font-style: italic;
  background: rgba(0, 0, 0, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  display: inline-block;
}

/* Responsive Design */
@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    min-width: unset;
    padding: 1.5rem;
  }

  .modal-actions {
    flex-direction: column;
  }

  .modal-actions button {
    width: 100%;
  }
}

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-content {
  animation: fadeIn 0.3s ease-out;
}

/* Personnalisation des inputs date et time */
input[type='date'],
input[type='time'],
input[type='text'] {
  width: 90% !important;
  appearance: none;
  -webkit-appearance: none;
  padding-right: 2rem;
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 1.5rem;
}

.app {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.layout {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 20px;
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.form-container {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.week-view {
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.weekdays-header {
  display: grid;
  grid-template-columns: 60px repeat(7, 1fr);
  background-color: #f8f9fa;
  border-bottom: 1px solid #ddd;
}

.nothing {
  width: 60px;
  border-left: 1px solid #ddd;
  padding: 12px;
  text-align: center;
  font-weight: bold;
  border-left: 1px solid #ddd;
}

.weekday {
  padding: 12px;
  text-align: center;
  font-weight: bold;
  border-left: 1px solid #ddd;
}

.calendar-grid {
  display: flex;
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  flex: 1;
}

.day-column {
  border-right: 1px solid #ddd;
}

.date-number {
  padding: 8px;
  text-align: center;
  font-weight: bold;
  border-bottom: 1px solid #ddd;
}

.room-day-cell.current-day {
  background-color: #f0f9ff;
}

.events-container {
  min-height: 100%;
}

.unscheduled-event {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 10px;
  cursor: move;
}

.unscheduled-event:hover {
  background-color: #e9ecef;
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.event-details {
  font-size: 0.9em;
  color: #666;
}

.btn-add {
  background-color: #42b983;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  width: 100%;
  margin-top: 20px;
}

.btn-remove {
  background: none;
  border: none;
  color: #dc3545;
  font-size: 1.2em;
  cursor: pointer;
  padding: 0 5px;
}

.btn-remove:hover {
  color: #bd2130;
}

.dp__input_wrap {
  svg {
    display: none;
  }

  .dp--clear-btn {
    svg {
      display: block;
    }
  }
}

/* Animation pour le drag & drop */
.calendar-event {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Style pour le drag & drop */
.calendar-event {
  cursor: pointer;
  transition: transform 0.2s;
}

.calendar-event:active {
  cursor: grabbing;
  transform: scale(0.95);
}

.room-day-cell {
  cursor: pointer; /* Assurez-vous qu'il y a suffisamment d'espace pour le drop */
  border: 1px solid #ddd;
  position: relative;
  min-height: 200px;
}

.room-day-cell.dragover {
  background-color: rgba(66, 185, 131, 0.1);
  border: 2px dashed #42b983;
}

.calendar-navigation {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;
}

.nav-btn {
  background: none;
  border: 1px solid #ddd;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  color: #333;
  transition: background-color 0.3s;
}

.nav-btn:hover {
  background-color: #f5f5f5;
}

.week-selector {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  min-width: 300px;
  text-align: center;
  transition: background-color 0.3s;
}

.week-selector:hover {
  background-color: #f5f5f5;
}

.hours-column {
  width: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-right: 1px solid #ddd;
  font-weight: bold;
  color: #666;
}

.hour-label {
  height: 200px;
  display: flex;
  align-items: start;
  justify-content: center;
  font-weight: bold;
  color: #666;
}

.hours-nothing {
  padding: 17px;
}
</style>
