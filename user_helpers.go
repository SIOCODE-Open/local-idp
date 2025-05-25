package main

// FindUserIndexById returns the index and pointer to a user in AppContext.Users if found
func FindUserIndexById(id string) (int, *IdpUser) {
	for i, u := range AppContext.Users {
		if u.Id == id {
			return i, &AppContext.Users[i]
		}
	}
	return -1, nil
}
