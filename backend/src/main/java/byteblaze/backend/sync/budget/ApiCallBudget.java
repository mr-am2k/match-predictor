package byteblaze.backend.sync.budget;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class ApiCallBudget {

    private final ApiCallLogRepository logRepo;

    @Value("${api.football.daily-call-limit:100}")
    private int dailyLimit;

    /**
     * Returns true if a call may proceed.
     */
    public boolean reserve(String endpoint) {
        long spent = logRepo.countByCalledAtAfter(LocalDateTime.now().minusHours(24));
        if (spent >= dailyLimit) {
            log.warn("API budget exhausted ({}/{}). Skipping {}", spent, dailyLimit, endpoint);
            return false;
        }
        return true;
    }

    public void record(String endpoint, Long competitionId, Integer statusCode, String note) {
        ApiCallLog row = ApiCallLog.builder()
                .endpoint(endpoint)
                .competitionId(competitionId)
                .statusCode(statusCode)
                .note(note)
                .build();
        logRepo.save(row);
    }

    public int getDailyLimit() {
        return dailyLimit;
    }

    public long getUsedLast24h() {
        return logRepo.countByCalledAtAfter(LocalDateTime.now().minusHours(24));
    }
}
