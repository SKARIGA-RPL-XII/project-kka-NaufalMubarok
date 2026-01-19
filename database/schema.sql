CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('ADMIN','PATIENT') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  nik VARCHAR(30) UNIQUE,
  phone VARCHAR(30),
  address TEXT,
  birth_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_patients_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE polyclinics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT
);

CREATE TABLE doctors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  polyclinic_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  schedule_info TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_doctors_poly FOREIGN KEY (polyclinic_id) REFERENCES polyclinics(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE queue_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  polyclinic_id INT NOT NULL UNIQUE,
  avg_service_minutes INT NOT NULL DEFAULT 10,
  CONSTRAINT fk_settings_poly FOREIGN KEY (polyclinic_id) REFERENCES polyclinics(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE queues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  queue_date DATE NOT NULL,
  polyclinic_id INT NOT NULL,
  patient_id INT NOT NULL,
  queue_number INT NOT NULL,
  status ENUM('WAITING','CALLED','SERVED','CANCELLED') NOT NULL DEFAULT 'WAITING',
  estimated_minutes INT DEFAULT NULL,
  called_at DATETIME DEFAULT NULL,
  served_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_queues_poly FOREIGN KEY (polyclinic_id) REFERENCES polyclinics(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_queues_patient FOREIGN KEY (patient_id) REFERENCES patients(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  UNIQUE KEY uq_queue_num (queue_date, polyclinic_id, queue_number),
  UNIQUE KEY uq_patient_once (queue_date, polyclinic_id, patient_id)
);

CREATE TABLE visits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  queue_id INT NOT NULL UNIQUE,
  complaint TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_visits_queue FOREIGN KEY (queue_id) REFERENCES queues(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);
