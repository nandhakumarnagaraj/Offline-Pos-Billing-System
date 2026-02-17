package com.biryanipos.backend.repository;

import com.biryanipos.backend.model.AppUser;
import com.biryanipos.backend.model.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<AppUser, Long> {
  Optional<AppUser> findByUsername(String username);

  boolean existsByUsername(String username);

  List<AppUser> findByRole(UserRole role);

  List<AppUser> findByActiveTrue();
}
