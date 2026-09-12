import assert from 'node:assert/strict';
import {
  ExperienceTable,
  TourScheduleTable,
  isExperienceOpen,
  isScheduleBookable
} from '../src/types.ts';

const isoOffset = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const baseExperience: ExperienceTable = {
  id: 1,
  title: 'Sample tour',
  location: 'Da Nang',
  duration: '1 day',
  price: 1000000,
  image: '',
  category: 'Nature',
  description: 'Sample',
  rating: 0,
  host_count: 1,
  reviews_count: 0,
  status: 'active',
  booking_open_date: isoOffset(-1),
  booking_close_date: isoOffset(1)
};

assert.equal(isExperienceOpen(baseExperience), true, 'active tour inside booking window should be open');
assert.equal(isExperienceOpen({ ...baseExperience, status: 'draft' }), false, 'draft tour should not be public');
assert.equal(isExperienceOpen({ ...baseExperience, status: 'pending_update' }), false, 'pending update tour should not be public');
assert.equal(isExperienceOpen({ ...baseExperience, booking_open_date: isoOffset(1) }), false, 'future booking window should not be open');
assert.equal(isExperienceOpen({ ...baseExperience, booking_close_date: isoOffset(-1) }), false, 'expired booking window should not be open');

const baseSchedule: TourScheduleTable = {
  id: 1,
  experience_id: 1,
  start_date: isoOffset(2),
  end_date: isoOffset(3),
  meeting_time: '08:00',
  max_slots: 10,
  remaining_slots: 10,
  created_at: new Date().toISOString()
};

assert.equal(isScheduleBookable(baseSchedule), true, 'future departure should be bookable');
assert.equal(isScheduleBookable({ ...baseSchedule, start_date: isoOffset(-1), end_date: isoOffset(0) }), false, 'past departure should not be bookable');

console.log('Booking logic checks passed');
