package byteblaze.backend.competition.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "competitions", schema = "external_data")
@Getter
@Setter
@NoArgsConstructor
public class Competition {
    @Id
    private Long id;
    private String name;
    private String type;
    private String logoUrl;
    private String countryName;
    private String countryFlagUrl;
    private Integer seasonYear;
    private LocalDate seasonStart;
    private LocalDate seasonEnd;
    private LocalDateTime lastSyncedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
