import { defineStore } from 'pinia'
import { getRooms, getReservations, createReservation, updateReservation, deleteReservation } from '../services/api'

export const useRoomStore = defineStore('room', {
  state: () => ({
    reservations: [],
    rooms: [
      { id: 1, name: 'Salle A', capacity: 10, equipment: 'Projecteur, Tableau blanc' },
      { id: 2, name: 'Salle B', capacity: 20, equipment: 'Écran TV, Système de visioconférence' },
      { id: 3, name: 'Salle C', capacity: 30, equipment: 'Projecteur, Système audio' },
      { id: 4, name: 'Salle D', capacity: 15, equipment: 'Tableau blanc, Wifi haute vitesse' }
    ],
    loading: false,
    error: null,
    pollingInterval: null,
    lastFetchTime: null
  }),

  getters: {
    getAllRooms: (state) => state.rooms,

    getAvailableRooms: (state) => (date, start, end) => {
      return state.rooms.filter(room => {
        return !state.reservations.some(reservation =>
          reservation.roomId === room.id &&
          reservation.date === date &&
          ((start >= reservation.start && start < reservation.end) ||
            (end > reservation.start && end <= reservation.end) ||
            (start <= reservation.start && end >= reservation.end))
        )
      })
    },

    isRoomAvailable: (state) => (roomId, date, start, end, excludeId = null) => {
      const checkDate = new Date(date)
      console.log('Checking availability for:', {
        roomId,
        date: checkDate,
        start,
        end,
        excludeId
      })

      return !state.reservations.some(reservation => {
        // Ignorer la réservation elle-même lors d'un déplacement
        if (excludeId && reservation.id === excludeId) return false

        // Vérifier si même salle
        if (reservation.roomId !== roomId) return false

        // Vérifier si même date
        const reservationDate = new Date(reservation.date)
        console.log('Comparing with reservation:', {
          id: reservation.id,
          date: reservationDate,
          start: reservation.start,
          end: reservation.end
        })

        const sameDate =
          reservationDate.getFullYear() === checkDate.getFullYear() &&
          reservationDate.getMonth() === checkDate.getMonth() &&
          reservationDate.getDate() === checkDate.getDate()

        if (!sameDate) return false

        // Vérifier le chevauchement horaire
        const timeOverlap = (
          (start >= reservation.start && start < reservation.end) ||
          (end > reservation.start && end <= reservation.end) ||
          (start <= reservation.start && end >= reservation.end)
        )

        if (timeOverlap) {
          console.log('Time overlap detected')
        }

        return timeOverlap
      })
    }
  },

  actions: {
    async fetchRooms() {
      try {
        this.loading = true
        const response = await getRooms()
        this.rooms = response.data
        console.log('Rooms fetched:', this.rooms)
      } catch (error) {
        console.error('Error fetching rooms:', error)
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    async fetchReservations() {
      try {
        this.loading = true
        const response = await getReservations()
        this.reservations = response.data
        this.lastFetchTime = new Date()
        console.log('Réservations mises à jour:', this.reservations)
      } catch (error) {
        console.error('Erreur lors de la récupération des réservations:', error)
        this.error = error
      } finally {
        this.loading = false
      }
    },

    async addReservation(reservation) {
      try {
        const response = await createReservation(reservation)
        this.reservations.push(response.data)
        // Forcer une mise à jour immédiate
        await this.fetchReservations()
        return response.data
      } catch (error) {
        console.error('Erreur lors de l\'ajout de la réservation:', error)
        throw error
      }
    },

    async updateReservation(id, updatedReservation) {
      try {
        const response = await updateReservation(id, updatedReservation)
        const index = this.reservations.findIndex(r => r.id === id)
        if (index !== -1) {
          this.reservations[index] = response.data
        }
        // Forcer une mise à jour immédiate
        await this.fetchReservations()
        return response.data
      } catch (error) {
        console.error('Erreur lors de la mise à jour de la réservation:', error)
        throw error
      }
    },

    async deleteReservation(id) {
      try {
        await deleteReservation(id)
        this.reservations = this.reservations.filter(r => r.id !== id)
        console.log('Reservation deleted:', id)
      } catch (error) {
        console.error('Error deleting reservation:', error)
        throw error
      }
    },

    // Pour le debug
    getReservations() {
      console.log('Réservations actuelles:', this.reservations)
      return this.reservations
    },

    getReservationsByDate(date) {
      if (!date) return []
      const checkDate = new Date(date).toDateString()
      return this.reservations.filter(reservation =>
        new Date(reservation.date).toDateString() === checkDate
      )
    },

    startPolling() {
      console.log('Démarrage du polling des réservations')
      // Arrêter le polling existant s'il y en a un
      this.stopPolling()

      // Démarrer un nouveau polling
      this.pollingInterval = setInterval(async () => {
        console.log('Polling: récupération des réservations')
        await this.fetchReservations()
      }, 2000) // Polling toutes les 2 secondes
    },

    stopPolling() {
      if (this.pollingInterval) {
        console.log('Arrêt du polling des réservations')
        clearInterval(this.pollingInterval)
        this.pollingInterval = null
      }
    }
  }
})
