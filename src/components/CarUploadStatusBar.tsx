import { AlertTriangle, Car, Check, X } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { dismissCarUploadJob, getCarUploadJobsSnapshot, subscribeCarUploadJobs } from '../lib/carUploadQueue'
import styles from './CarUploadStatusBar.module.css'

export function CarUploadStatusBar() {
  const jobs = useSyncExternalStore(subscribeCarUploadJobs, getCarUploadJobsSnapshot)

  if (jobs.length === 0) return null

  return (
    <div className={styles.stack}>
      {jobs.map((job) => (
        <div key={job.id} className={`${styles.bar} ${styles[job.status]}`} role="status">
          <div className={styles.thumb}>
            {job.thumbnailUrl ? (
              <img src={job.thumbnailUrl} alt="" className={styles.thumbImage} />
            ) : (
              <div className={styles.thumbFallback}>
                <Car size={16} strokeWidth={1.75} />
              </div>
            )}
          </div>

          <div className={styles.body}>
            <span className={styles.title}>{job.vehicleTitle}</span>

            {job.status === 'uploading' && (
              <>
                <div
                  className={styles.progressTrack}
                  role="progressbar"
                  aria-label={`Uploading ${job.vehicleTitle}`}
                  aria-valuemin={0}
                  aria-valuemax={job.totalCount > 0 ? job.totalCount : undefined}
                  aria-valuenow={job.totalCount > 0 ? job.uploadedCount : undefined}
                >
                  <div
                    className={styles.progressFill}
                    style={{
                      width: job.totalCount > 0 ? `${Math.round((job.uploadedCount / job.totalCount) * 100)}%` : '30%',
                    }}
                  />
                </div>
                <span className={styles.warning}>Adding to inventory — don't close this tab</span>
              </>
            )}

            {job.status === 'success' && (
              <span className={styles.successText}>
                <Check size={13} strokeWidth={2.5} />
                Car added
              </span>
            )}

            {job.status === 'error' && (
              <span className={styles.errorText}>
                <AlertTriangle size={13} strokeWidth={2.5} />
                {job.errorMessage ?? "Couldn't add this vehicle."}
              </span>
            )}
          </div>

          <button
            type="button"
            className={styles.dismiss}
            aria-label="Dismiss"
            onClick={() => dismissCarUploadJob(job.id)}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
