package byteblaze.backend.sync.budget;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "api_call_log", schema = "external_data")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiCallLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "called_at", nullable = false)
    private LocalDateTime calledAt;

    @Column(nullable = false)
    private String endpoint;

    @Column(name = "competition_id")
    private Long competitionId;

    @Column(name = "status_code")
    private Integer statusCode;

    private String note;

    @PrePersist
    public void onCreate() {
        if (calledAt == null) {
            calledAt = LocalDateTime.now();
        }
    }
}
